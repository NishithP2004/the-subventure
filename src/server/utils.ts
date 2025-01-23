import { AzureOpenAI } from "openai";
import { Devvit } from "@devvit/public-api";

Devvit.configure({
  http: true,
});

interface Post {
  subredditName: string;
  authorName: string;
  title: string;
  permalink: string;
  body: string | undefined;
  bodyHtml?: string | undefined;
  thumbnail: string | undefined;
}

interface RiddlesResponse {
  riddles: {
    subreddit: {
      name: string;
      emoji: string;
    };
    riddle: string;
    question: string;
    answer: string;
  }[];
}

const model_name = "gemini-2.0-flash-exp";

const RIDDLE_GENERATION_PROMPT = `
You are an intelligent riddle generator tasked with creating engaging riddles based on Reddit posts. 

Here's what you need to do:
1. Generate a riddle inspired by the content of a given Reddit post (title, body, and metadata). The user should be able to locate the post using this riddle.
2. Represent the subreddit's name using an emoji or combination of emojis that reflect the subreddit's theme.
3. Frame a follow-up question based on the post's content to make the riddle interactive.
4. Provide the correct answer for the question, ensuring it matches the post's content and the answer is always a one word answer or a short phrase.
5. Ensure that the length of the "riddles" array matches the number of input posts and is generated according to the order of the provided posts (i.e generate a riddle for each unique post).

Your output must strictly follow this JSON schema:
{
    "riddles": [
        {
            "subreddit": {
                "name": "Subreddit Name",
                "emoji": "Emoji representation of the subreddit name"
            },
            "riddle": "Generated riddle inspired by the post.",
            "question": "A question based on the post.",
            "answer": "Answer for the above question. Must be a *single world* answer or a short phrase."
        },
        ...
    ]
}
`;

const CHAT_PROMPT = `
You are "The Riddler", a clever and enigmatic assistant who guides users through riddles in a cryptic yet engaging manner. 
You never give direct answers but provide subtle, thought-provoking clues to help users solve riddles on their own. 
Your tone is playful, mysterious, and encouraging. Use metaphors, hints, and gentle nudges instead of revealing the solution outright.

Return your answer in the following JSON format:
{
    "message": "Message to be sent back to the user."
}
`;

const STORYLINE_GENERATION_PROMPT = `
You are a creative assistant tasked with generating a cohesive storyline and an imaginative image generation prompt for a Stable Diffusion model. 

Instructions:
1.	Storyline Creation:
    - Create a narrative that connects the riddles and the answers into a seamless adventure.
    - Include elements of exploration, discovery, and the themes of the subreddits from the riddles object.
    - Highlight key moments from the conversation history (e.g., challenges solved, user insights, and assistant hints).
    - Ensure the storyline is engaging, adventurous, and appropriate for the user's journey.
2.	Image Generation Prompt:
    - Craft a detailed, vivid prompt for Stable Diffusion based on the storyline.
    - Include visual elements tied to the subreddits, the answers to the riddles, and key narrative moments.
    - Use descriptive language to capture the mood, themes, and colors of the storyline.

Use the provided conversation history and riddles object to create an engaging narrative that ties the solved riddles into a unified adventure.

The response must strictly follow this JSON format:

{
    "title": "A captivating title for the storyline / narrative",
    "storyline": "The generated storyline / narrative.",
    "prompt": "Image generation prompt based on the storyline which will be passed to a Stable Diffusion model"
}
`;

async function generateRiddles(
  context: Devvit.Context,
  posts: Post[],
): Promise<RiddlesResponse | undefined> {
  try {
    const apiKey = (await context.settings.get("gemini-api-key")) as string;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${apiKey}`;
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
                          Use the following posts to generate riddles and adhere to the JSON format:
                          ${JSON.stringify({ posts })}
                      `,
            },
          ],
        },
      ],
      systemInstruction: {
        role: "user",
        parts: [
          {
            text: RIDDLE_GENERATION_PROMPT,
          },
        ],
      },
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }).then((response) => {
      return response.json();
    });
    const riddles = response.candidates[0].content.parts[0].text;
    console.log(riddles)
    return JSON.parse(riddles as string) as RiddlesResponse;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error generating riddles:", err.message);
    }
  }
}

async function chatWithAI(
  context: Devvit.Context,
  riddle: any,
  post: any,
  conversation_history: { from: string; text: string }[],
  query: string,
): Promise<{ message: string } | undefined> {
  try {
    const apiKey = (await context.settings.get("gemini-api-key")) as string;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${apiKey}`;
    const history = Array.from(conversation_history).splice(-1, 5);

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
                              User History (The ongoing conversation history between you and the user.): 
                              ${JSON.stringify(history)} 
                              `,
            },
            {
              text: `
                              Post Information (Details of the Reddit post tied to the riddle): 
                              ${JSON.stringify(post)} 
                              `,
            },
            {
              text: `
                              Associated Riddle Object: 
                              ${JSON.stringify(riddle)}
                              `,
            },
            {
              text: `
                              User Query (The current query or input from the user about the riddle.): 
                              ${query} 
                              `,
            },
          ],
        },
      ],
      systemInstruction: {
        role: "user",
        parts: [
          {
            text: CHAT_PROMPT,
          },
        ],
      },
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }).then((response) => {
      return response.json();
    });
    const message = response.candidates[0].content.parts[0].text;
    console.log(message)
    return JSON.parse(message as string) as { message: string };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error generating response for chat query:", err.message);
    }
  }
}

async function generateStoryline(
  context: Devvit.Context,
  riddles: any,
  conversation_history: { from: string; text: string }[],
): Promise<
  { title: string; storyline: string; thumbnail: string } | undefined
> {
  try {
    const apiKey = (await context.settings.get("gemini-api-key")) as string;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${apiKey}`;
    const history = Array.from(conversation_history);
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
                              Conversation History (A record of the ongoing interaction between the user and the assistant, including solved riddles, hints given, and user comments.): 
                              ${history} 
                              `,
            },
            {
              text: `
                              Riddles Object: 
                              ${JSON.stringify(riddles)}
                              `,
            },
          ],
        },
      ],
      systemInstruction: {
        role: "user",
        parts: [
          {
            text: STORYLINE_GENERATION_PROMPT,
          },
        ],
      },
      generationConfig: {
        temperature: 1,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    }).then((response) => {
      return response.json();
    });
    const result = response.candidates[0].content.parts[0].text;
    const { title, storyline, prompt } = JSON.parse(result as string);
    const thumbnail = await generateThumbnail(context, prompt);

    return {
      title,
      storyline,
      thumbnail,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error generating storyline:", err.message);
    }
  }
}
async function generateThumbnail(
  context: Devvit.Context,
  prompt: string,
): Promise<string> {
  const apiKey = (await context.settings.get("azure-openai-api-key")) as string;
  const apiEndpoint = (await context.settings.get(
    "azure-openai-api-endpoint",
  )) as string;

  const model = new AzureOpenAI({
    apiKey: apiKey,
    apiVersion: "2024-02-01",
    deployment: "dall-e-3",
    endpoint: apiEndpoint,
  });

  async function generateImage(prompt: string): Promise<string> {
    try {
      const image = await model.images.generate({
        prompt: prompt,
        model: "dall-e-3",
        quality: "standard",
        size: "1024x1024",
        response_format: "url",
        n: 1,
      });

      return image.data[0].url as string;
    } catch (err) {
      console.error("Error generating image.");
      console.log(err)
      throw err;
    }
  }

  return generateImage(prompt);
}

export { generateRiddles, chatWithAI, generateStoryline };