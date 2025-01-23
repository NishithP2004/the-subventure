import {
  Devvit,
  Context,
  useState,
  useAsync,
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
          text: `u/${username}\n\n` + storyline,
        });
      })
      .image({ mediaId: response.mediaId });

    const post = await context.reddit.submitPost({
      subredditName: context.subredditName as string,
      title: title,
      richtext: richtext,
    });

    context.ui.showToast("Storyline created successfully!");
    context.ui.navigateTo(post.url);
  } catch (err) {
    context.ui.showToast(`Error creating storyline`);
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
  const [stage, setStage] = useState(1);
  const [history, setHistory] = useState<any[]>([
    {
      from: "assistant",
      text: "Welcome to the Chat!",
    },
  ]);
  const [riddles, setRiddles] = useState([]);
  const [posts, setPosts] = useState([]);

  const { data: userId } = useAsync(async () => {
    const user = await reddit.getCurrentUser();
    return user?.id as string;
  });

  useAsync(
    async () => {
      const riddles = JSON.parse(
        (await redis.get(
          `${context.postId}:users:${userId}:games:${gameId}:game-state:riddles`,
        )) as string,
      ).riddles;

      const posts = JSON.parse(
        (await redis.get(
          `${context.postId}:users:${userId}:games:${gameId}:game-state:posts`,
        )) as string,
      ).posts;

      context.ui.webView.postMessage("myWebView", {
        type: "riddles",
        data: {
          gameId: gameId,
          userId: userId,
          riddles,
        },
      });

      return {
        riddles,
        posts,
      };
    },
    {
      finally: (data) => {
        if (data) {
          setRiddles(data.riddles);
          setPosts(data.posts);
        }
      },
    },
  );

  const handleWebViewMessage = async (msg: any) => {
    if (msg.type === "game-state") {
      if (msg.data.status === "ongoing") {
        setStage(msg.data.stage);
      } else if (msg.data.status === "complete") {
        const user = await reddit.getCurrentUser();
        await redis.zIncrBy(
          "leaderboard",
          user?.username as string,
          msg.data.score,
        );

        /* console.log("Game Status:", await redis.get(`${context.postId}:users:${user?.id}:games:${gameId}:game-state:status`))
        const riddles = JSON.parse(
          (await redis.get(
            `${context.postId}:users:${user?.id as string}:games:${gameId}:game-state:riddles`,
          )) as string,
        ).riddles; */

        const response = await generateStoryline(
          context,
          msg.data.riddles,
          history,
        );
        await createPost(
          context,
          user?.username as string,
          response?.title as string,
          response?.storyline as string,
          response?.thumbnail as string,
        );
      }
    }
  };
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
        onMessage={handleWebViewMessage}
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
        riddle={riddles[stage - 1]}
        post={posts[stage - 1]}
      />
    </hstack>
  );
};

export default GameScreen;
