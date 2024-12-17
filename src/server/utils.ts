import { GoogleGenerativeAI } from "@google/generative-ai";
/* import {
    FileMetadataResponse,
    GoogleAIFileManager
} from "@google/generative-ai/server"; */
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
      name: string; // Name of the subreddit
      emoji: string; // Emoji representation of the subreddit name
    };
    riddle: string; // Generated riddle inspired by the post
    question: string; // A question based on the post
    answer: string; // Answer for the above question
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
  userId: string,
  gameId: string,
): Promise<RiddlesResponse | undefined> {
  try {
    const apiKey = (await context.settings.get("gemini-api-key")) as string;

    /* const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        })

        const fileManager = new GoogleAIFileManager(apiKey);

        async function uploadToGemini(path: string, mimeType: string): Promise<FileMetadataResponse> {
            const uploadResult = await fileManager.uploadFile(path, {
                mimeType,
                displayName: path,
            });
            const file = uploadResult.file;
            console.log(`Uploaded file ${file.displayName} as: ${file.name}`);
            return file;
        }
        
        async function waitForFilesActive(files: FileMetadataResponse[]) {
            console.log("Waiting for file processing...");
            for (const name of files.map((file) => file.name)) {
                let file = await fileManager.getFile(name);
                while (file.state === "PROCESSING") {
                    await new Promise((resolve) => setTimeout(resolve, 10000));
                    file = await fileManager.getFile(name)
                }
                if (file.state !== "ACTIVE") {
                    throw Error(`File ${file.name} failed to process`);
                }
            }
            console.log("...all files ready\n");
        } 

        const chatSession = model.startChat({
            generationConfig: {
                temperature: 1,
                responseMimeType: "application/json"
            },
            systemInstruction: {
                text: RIDDLE_GENERATION_PROMPT
            },
            history: []
        })

        const result = await chatSession.sendMessage(`
        Use the following example posts to generate riddles and adhere to the JSON format:
        ${posts?.toString()}
    `)

        return JSON.parse(result.response.text()).riddles */

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent`;
    const { redis } = context;

    const posts = await redis.get(
      `${context.postId}:users:${userId}:games:${gameId}:game-state:posts`,
    );
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
                        Use the following posts to generate riddles and adhere to the JSON format:
                        
                        ${posts}
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
      console.log(`Status: ${response.status}`);
      return response.json();
    });

    console.log(response.candidates[0].content);
    const riddles = response.candidates[0].content.parts[0].text;
    console.log(riddles);

    return JSON.parse(riddles as string) as RiddlesResponse;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error generating riddles:", err.message);
    }
  }
}

async function chat(
  context: Devvit.Context,
  userId: string,
  gameId: string,
  stage: number,
  conversation_history: { from: string; text: string }[],
  query: string,
): Promise<{ message: string } | undefined> {
  try {
    const apiKey = (await context.settings.get("gemini-api-key")) as string;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${apiKey}`;
    const { redis } = context;

    const post = JSON.parse(
      (await redis.get(
        `${context.postId}:users:${userId}:games:${gameId}:game-state:posts`,
      )) as string,
    ).posts[stage - 1];
    const riddle = JSON.parse(
      (await redis.get(
        `${context.postId}:users:${userId}:games:${gameId}:game-state:riddles`,
      )) as string,
    ).riddles[stage - 1];
    const history = Array.from(conversation_history).splice(-1, 5);
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
                        User History (The ongoing conversation history between you and the user.): 
                        ${history} 
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
    console.log(message);

    return JSON.parse(message as string) as { message: string };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error generating response for chat query:", err.message);
    }
  }
}

async function generateStoryline(
  context: Devvit.Context,
  userId: string,
  gameId: string,
  conversation_history: { from: string; text: string }[],
): Promise<
  { title: string; storyline: string; thumbnail: string } | undefined
> {
  try {
    const apiKey = (await context.settings.get("gemini-api-key")) as string;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model_name}:generateContent?key=${apiKey}`;
    const { redis } = context;

    const riddles = (await redis.get(
      `${context.postId}:users:${userId}:games:${gameId}:game-state:riddles`,
    )) as string;
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
                        ${riddles}
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
    console.log(result);

    const { title, storyline, prompt } = JSON.parse(result as string);
    const thumbnail = await generateThumbnail(context, prompt);

    return {
      title,
      storyline,
      thumbnail,
    };
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error generating riddles:", err.message);
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
    deployment: "dall-e-3",
    endpoint: apiEndpoint,
  });

  async function generateImage(prompt: string): Promise<string> {
    try {
      const image = await model.images.generate({
        prompt: prompt,
        model: "dall-e-3",
        quality: "standard",
        size: "512x512",
        response_format: "url",
        n: 1,
      });

      return image.data[0].url as string;
    } catch (err) {
      console.error("Error generating image.");
      throw err;
    }
  }

  return generateImage(prompt);
}

export { generateRiddles, chat, generateStoryline };
