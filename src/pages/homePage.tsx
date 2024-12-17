import { Devvit, Context } from "@devvit/public-api";

const HomePage = ({
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
        height="25px"
        weight="bold"
      >
        The SubVenture 🧭
      </text>
      <button
        appearance="primary"
        icon="play"
        width="80%"
        height="50px"
        onPress={() => setPage("loading")}
      >
        Start Game
      </button>
      <button
        appearance="secondary"
        icon="list-numbered"
        width="80%"
        height="50px"
        onPress={() => setPage("leaderboard")}
      >
        Leaderboard
      </button>
      <button
        appearance="secondary"
        icon="help"
        width="80%"
        height="50px"
        onPress={() => setPage("how-to-play")}
      >
        How To Play
      </button>
    </vstack>
  );
};

export default HomePage;
