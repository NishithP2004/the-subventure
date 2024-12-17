// Learn more at developers.reddit.com/docs
import { Devvit, useState } from "@devvit/public-api";
import HomePage from "./pages/homePage.js";
import LoadingPage from "./pages/loading.js";
import GameScreen from "./pages/gameScreen.js";
import Leaderboard from "./pages/leaderboard.js";
import HowToPlay from "./pages/howToPlay.js";

Devvit.configure({
  redditAPI: true,
  http: true,
  redis: true,
  media: true,
});

Devvit.addSettings([
  {
    name: "azure-openai-api-key",
    label: "Azure Open AI API key",
    type: "string",
    isSecret: true,
    scope: "app",
  },
  {
    name: "azure-openai-api-endpoint",
    label: "Azure Open AI API Endpoint",
    type: "string",
    isSecret: true,
    scope: "app",
  },
  {
    name: "gemini-api-key",
    label: "Google Gemini API key",
    type: "string",
    isSecret: true,
    scope: "app",
  },
]);

// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: "Add my post",
  location: "subreddit",
  forUserType: "moderator",
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    ui.showToast(
      "Submitting your post - upon completion you'll navigate there.",
    );
    const subreddit = await reddit.getCurrentSubreddit();

    const post = await reddit.submitPost({
      title: "My devvit post",
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading ...</text>
        </vstack>
      ),
    });
    ui.navigateTo(post);
  },
});

// Add a post type definition
Devvit.addCustomPostType({
  name: "Experience Post",
  height: "tall",
  render: (_context) => {
    const [page, setPage] = useState("home");
    const [gameId, setGameId] = useState("");
    let currentPage;

    switch (page) {
      case "home":
        currentPage = (
          <HomePage
            setPage={setPage}
            context={_context}
            gameId={gameId}
            setGameId={setGameId}
          />
        );
        break;
      case "loading":
        currentPage = (
          <LoadingPage
            setPage={setPage}
            context={_context}
            gameId={gameId}
            setGameId={setGameId}
          />
        );
        break;
      case "game-screen":
        currentPage = (
          <GameScreen
            setPage={setPage}
            context={_context}
            gameId={gameId}
            setGameId={setGameId}
          />
        );
        break;
      case "leaderboard":
        currentPage = <Leaderboard context={_context} setPage={setPage} />;
        break;
      case "how-to-play":
        currentPage = <HowToPlay setPage={setPage} context={_context} />;
        break;
      default:
        currentPage = (
          <HomePage
            setPage={setPage}
            context={_context}
            gameId={gameId}
            setGameId={setGameId}
          />
        );
    }

    return <blocks>{currentPage}</blocks>;
  },
});

export default Devvit;
