import {
  Devvit,
  useState,
  useInterval,
  Context,
  RedditAPIClient,
  useAsync,
} from "@devvit/public-api";
import subreddits from "../subreddits.json" assert { type: "json" };
import { generateRiddles } from "../server/utils.js";

const phrases = [
  "Charting your course through the Redditverse...",
  "Deciphering ancient riddles from the archives...",
  "Rolling the dice of destiny...",
  "Connecting the dots on your treasure map...",
  "Sharpening the AI's riddler hat...",
  "Packing your adventurer's toolkit...",
  "Hiding treasures and leaving clues...",
  "Revealing the secrets of the subreddits...",
  "Dusting off the scrolls of Reddit lore...",
  "Summoning the Riddler's cryptic conundrums...",
  "Piecing together the puzzle paths...",
  "Loading emoji breadcrumbs...",
  "Unlocking the gates to your next adventure...",
  "Training the AI to tease your brain...",
  "Your quest is about to begin...",
  "Following the trails of karma...",
  "Scouting subreddits for hidden treasures...",
  "Spinning the compass of curiosity...",
  "Igniting the spark of exploration...",
  "Decoding the mysteries of the map...",
];

interface Post {
  subredditName: string;
  authorName: string;
  title: string;
  permalink: string;
  body: string | undefined;
  bodyHtml?: string | undefined;
  thumbnail: string | undefined;
}

function generateHash(n = 4) {
  const chars =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let hash = "";

  for (let i = 0; i < n; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }

  return hash;
}

async function fetchPosts(n = 5, reddit: RedditAPIClient) {
  try {
    const forums = new Set<string>();
    while (forums.size < n) {
      forums.add(subreddits[Math.floor(Math.random() * subreddits.length)]);
    }

    const posts = await Promise.all(
      Array.from(forums).map(async (forum: string) => {
        const p = await reddit
          .getNewPosts({
            subredditName: forum || "random",
            limit: 20,
          })
          .all();

        return p
          .map((e) => ({
            subredditName: e.subredditName,
            authorName: e.authorName,
            title: e.title,
            permalink: e.permalink,
            body: e.body,
            thumbnail: e.thumbnail?.url,
          }))
          .filter((e) => e.body);
      }),
    );

    const flattenedPosts = posts.flat();

    const randomPostsSet = new Set<Post>();
    while (randomPostsSet.size < n && flattenedPosts.length > 0) {
      const randomIndex = Math.floor(Math.random() * flattenedPosts.length);
      const [randomPost] = flattenedPosts.splice(randomIndex, 1);
      randomPostsSet.add(randomPost);
    }

    return Array.from(randomPostsSet);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("Error fetching posts:", err.message);
    } else {
      console.error("Unknown error fetching posts");
    }
    return [];
  }
}

const LoadingPage = ({
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
  const [index, setIndex] = useState(0);

  if (!gameId) {
    let hash = generateHash(8);
    setGameId(hash);
  }

  const { data: userId } = useAsync(
    async () => {
      const user = await reddit.getCurrentUser();
      return user?.id as string;
    },
    { depends: [] },
  );

  const { data: ack } = useAsync(
    async () => {
      const posts = await fetchPosts(5, reddit);
      await redis.set(
        `${context.postId}:users:${userId}:games:${gameId}:game-state:posts`,
        JSON.stringify({ posts }),
        {
          expiration: new Date(new Date().getTime() + 1000 * 60 * 60), // TTL: 1hr
        },
      );

      const response = await generateRiddles(context, posts);
      await redis.set(
        `${context.postId}:users:${userId}:games:${gameId}:game-state:riddles`,
        JSON.stringify({ riddles: response?.riddles }),
        {
          expiration: new Date(new Date().getTime() + 1000 * 60 * 60), // TTL: 1hr
        },
      );
      await redis.set(
        `${context.postId}:users:${userId}:games:${gameId}:game-state:status`,
        "ready",
        {
          expiration: new Date(new Date().getTime() + 1000 * 60 * 60),
        },
      );
      return "ready";
    },
    { depends: [] },
  );

  const interval = useInterval(() => {
    if (index === phrases.length - 1) interval.stop();
    setIndex((i) => (i + 1) % phrases.length);
  }, 1000 * 3);
  interval.start();

  const pollingInterval = useInterval(async () => {
    if (ack === "ready") {
      setPage("game-screen");
      pollingInterval.stop();
      const questReady = await redis.get(
        `${context.postId}:users:${userId}:games:${gameId}:game-state:status`,
      );

      if (questReady === "ready") {
        setPage("game-screen");
        pollingInterval.stop();
      }
    }
  }, 1000 * 10);

  pollingInterval.start();

  return (
    <vstack
      width="100%"
      height="100%"
      alignment="center middle"
      border="thin"
      cornerRadius="large"
      backgroundColor="lightblue"
      padding="large"
      gap="large"
    >
      <text
        alignment="center"
        size="xxlarge"
        style="heading"
        color="darkblue"
        weight="bold"
      >
        {phrases[index]}
      </text>
    </vstack>
  );
};

export default LoadingPage;
