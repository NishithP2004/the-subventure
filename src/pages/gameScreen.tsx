import {
  Devvit,
  Context,
  useAsync,
  useState,
  RichTextBuilder,
} from "@devvit/public-api";
import Chat from "./chat.js";
import { generateStoryline } from "../server/utils.js";

async function createPost(
  context: Context,
  username: string,
  title: string,
  storyline: string,
  thumbnail: string,
) {
  try {
    const response = await context.media.upload({
      url: thumbnail,
      type: "image",
    });

    const richtext = new RichTextBuilder()
      .paragraph((paragraph) =>
        paragraph.userMention({
          username: username,
          showPrefix: true,
        }),
      )
      .paragraph((paragraph) => {
        paragraph.text({
          text: storyline,
        });
      })
      .image({ mediaId: response.mediaId });

    await context.reddit.submitPost({
      subredditName: context.subredditName as string,
      title: title,
      richtext: richtext,
    });

    context.ui.showToast("Rich Post created successfully!");
  } catch (err) {
    context.ui.showToast(`Error creating Rich Post: ${err}`);
  }
}
const GameScreen = ({
  setPage,
  context,
  gameId,
  setGameId,
}: {
  setPage: (page: string) => void;
  context: Context;
  gameId: string;
  setGameId: (gameId: string) => void;
}) => {
  const { redis, reddit } = context;
  /* context.ui.webView.postMessage('myWebView', {
        type: 'riddles',
        data: {
            "gameId": gameId,
            "riddles": [
                {
                    "subreddit": {
                        "name": "AnimalsBeingBros",
                        "emoji": "🦓🦁"
                    },
                    "riddle": "I’m where loyalty shines in nature’s domain, when one is in danger, another takes the strain. Seek my name where friendships are raw, animals unite with a moment of awe.",
                    "question": "What species is mentioned in the post title?",
                    "answer": "bird"
                },
                {
                    "subreddit": {
                        "name": "explainlikeimfive",
                        "emoji": "🤔📚"
                    },
                    "riddle": "I measure energy in bites and bowls, science reveals my invisible roles. Find me where answers come concise, explained for a mind that seeks simple advice.",
                    "question": "How many calories are there in 100g of chicken?",
                    "answer": "240 kcal"
                }
            ]
        },
      }); */
  const [stage, setStage] = useState(0);
  const [history, setHistory] = useState([
    {
      from: "assistant",
      text: "Welcome to the Chat!",
    },
  ]);
  /* const [riddles, setRiddles] = useState(null)
      const [posts, setPosts] = useState(null) */

  const { data: userId } = useAsync(async () => {
    const user = await reddit.getCurrentUser();
    return user?.id as string;
  });

  useAsync(async () => {
    const riddles = JSON.parse(
      (await redis.get(
        `${context.postId}:users:${userId}:games:${gameId}:game-state:riddles`,
      )) as string,
    ).riddles;
    console.log(riddles);
    /* setRiddles(riddles)
        const posts = JSON.parse((await redis.get(`${context.postId}:users:${userId}:games:${gameId}:game-state:posts`)) as string).posts
        setPosts(posts) */

    context.ui.webView.postMessage("myWebView", {
      type: "riddles",
      data: {
        gameId: gameId,
        riddles,
      },
    });
    return "";
  });

  return (
    <hstack
      alignment="center middle"
      gap="medium"
      width="100%"
      height="100%"
      backgroundColor="lightblue"
      cornerRadius="large"
      padding="medium"
    >
      <webview
        id="myWebView"
        url="index.html"
        onMessage={(msg: any) => {
          console.log("Received from webview:", msg);
          if (msg.type === "game-state") {
            if (msg.data.status === "ongoing") {
              setStage(msg.data.stage);
            } else if (msg.data.status === "complete") {
              useAsync(async () => {
                const user = await reddit.getCurrentUser();
                await redis.zAdd("leaderboard", {
                  member: user?.username as string,
                  score: msg.data.score,
                });

                const response = await generateStoryline(
                  context,
                  userId as string,
                  gameId,
                  history,
                );
                await createPost(
                  context,
                  user?.username as string,
                  response?.title as string,
                  response?.storyline as string,
                  response?.thumbnail as string,
                );
                return "";
              });
            }
          }
        }}
        width="50%"
        height="100%"
      />
      <Chat
        setPage={setPage}
        context={context}
        gameId={gameId}
        setGameId={setGameId}
        stage={stage}
        history={history}
        setHistory={setHistory}
      />
    </hstack>
  );
};

export default GameScreen;
