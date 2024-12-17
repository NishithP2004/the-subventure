import { Devvit, Context } from "@devvit/public-api";

const HowToPlay = ({
  setPage,
  context,
}: {
  setPage: (page: string) => void;
  context: Context;
}) => {
  return (
    <vstack
      width="100%"
      height="100%"
      alignment="top center"
      border="thin"
      cornerRadius="large"
      backgroundColor="lightblue"
      padding="medium"
      gap="medium"
    >
      <text size="xxlarge" weight="bold" color="#333">
        How to Play The Subventure
      </text>
      <spacer shape="invisible" size="medium"></spacer>
      <vstack width="80%" gap="small">
        <text size="large" weight="bold" color="#555">
          1. 🏁 Start Your Quest
        </text>

        <text size="large" weight="bold" color="#555">
          2. 🧩 Solve Riddles
        </text>

        <text size="large" weight="bold" color="#555">
          3. 🔍 Explore Subreddits
        </text>

        <text size="large" weight="bold" color="#555">
          4. 🔑 Find the Key
        </text>

        <text size="large" weight="bold" color="#555">
          5. 🛤️ Follow the Path
        </text>

        <text size="large" weight="bold" color="#555">
          6. 💡 Use Hints
        </text>

        <text size="large" weight="bold" color="#555">
          7. 🏆 Complete Your Adventure
        </text>

        <text size="large" weight="bold" color="#555">
          8. 📢 Share and Compete
        </text>
      </vstack>

      <text size="large" weight="bold" color="#333">
        Tips
      </text>
      <vstack width="80%" gap="small">
        <text color="#555">
          • Pay attention to riddle wording and emojis—they hint at the
          subreddit or post theme.
        </text>
        <text color="#555">
          • Explore the linked subreddit for additional clues or inspiration!
        </text>
      </vstack>

      <button
        appearance="secondary"
        icon="back"
        onPress={() => setPage("home")}
      >
        Back
      </button>
    </vstack>
  );
};

export default HowToPlay;
