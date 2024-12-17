import { Devvit, Context, useAsync, useState } from "@devvit/public-api";

const Leaderboard = ({
  setPage,
  context,
}: {
  setPage: (page: string) => void;
  context: Context;
}) => {
  const { redis, reddit } = context;
  const [members, setMembers] = useState<{ member: string; score: number }[]>(
    [],
  );

  const { data: username } = useAsync(async () => {
    const user = await reddit.getCurrentUser();
    return user?.username as string;
  });

  useAsync(async () => {
    const members = await redis.zRange("leaderboard", 0, 9, { by: "rank" });
    setMembers(members);
    return "";
  });

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
        Leaderboard
      </text>
      <vstack width="80%" gap="small">
        <hstack
          width="100%"
          padding="small"
          backgroundColor="#4CAF50"
          cornerRadius="small"
          alignment="start"
          gap="medium"
        >
          <text weight="bold" color="white" width="10%">
            #
          </text>
          <text weight="bold" color="white" width="45%">
            Username
          </text>
          <text weight="bold" color="white" width="45%">
            Score
          </text>
        </hstack>
        {members.map((member, i) => (
          <hstack
            key={member.member}
            width="100%"
            padding="small"
            backgroundColor={i % 2 === 0 ? "#f9f9f9" : "#e0f7fa"}
            cornerRadius="small"
            alignment="start"
            gap="small"
          >
            <text width="10%" color="#555">
              {i + 1}.
            </text>
            <text width="45%" color="#555">
              {member.member}
            </text>
            <text width="45%" color="#555">
              {member.score}
            </text>
          </hstack>
        ))}
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

export default Leaderboard;
