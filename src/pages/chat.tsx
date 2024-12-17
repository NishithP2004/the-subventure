import {
  Devvit,
  Context,
  useState,
  useForm,
  useAsync,
} from "@devvit/public-api";
import { chat } from "../server/utils.js";

interface history {
  from: string;
  text: string;
}

const Chat = ({
  setPage,
  context,
  gameId,
  setGameId,
  stage,
  history,
  setHistory,
}: {
  setPage: (page: string) => void;
  context: Context;
  gameId: string;
  setGameId: (gameId: string) => void;
  stage: number;
  history: history[];
  setHistory: (history: history[]) => void;
}) => {
  const { data: username } = useAsync(async () => {
    const user = await context.reddit.getCurrentUser();
    return user?.username as string;
  });

  const { data: userId } = useAsync(async () => {
    const user = await context.reddit.getCurrentUser();
    return user?.id as string;
  });

  const myForm = useForm(
    {
      title: "Chat",
      fields: [
        {
          type: "string",
          name: "message",
          label: "Enter your message",
        },
      ],
    },
    async (values) => {
      const userMessage = values.message as string;
      if (userMessage.trim() === "") return;

      const resolvedUsername = username || "user";
      const updatedHistory = [
        ...history,
        { from: resolvedUsername, text: userMessage },
      ];
      setHistory(updatedHistory);

      const assistantResponse = (
        await chat(
          context,
          userId as string,
          gameId,
          stage,
          updatedHistory,
          userMessage,
        )
      )?.message;

      if (assistantResponse) {
        setHistory([
          ...updatedHistory,
          { from: "assistant", text: assistantResponse },
        ]);
      }
    },
  );

  return (
    <vstack
      width="50%"
      height="100%"
      alignment="bottom start"
      border="thin"
      cornerRadius="large"
      backgroundColor="white"
      padding="medium"
      gap="small"
    >
      <vstack alignment="bottom start" gap="small">
        {history.map((msg, index) => {
          return (
            <hstack key={index.toString()} gap="small" alignment="start">
              <text weight="bold" color="black">
                {msg.from}:
              </text>
              <text color="black" maxWidth="80%" wrap>
                {msg.text}
              </text>
            </hstack>
          );
        })}
      </vstack>
      <spacer size="medium" shape="invisible"></spacer>
      <hstack gap="small" alignment="start">
        <button
          appearance="primary"
          icon="send"
          onPress={() => {
            context.ui.showForm(myForm);
          }}
        >
          Send Message
        </button>
        <button
          appearance="secondary"
          icon="home"
          onPress={() => {
            setPage("home");
          }}
        >
          Home
        </button>
      </hstack>
    </vstack>
  );
};

export default Chat;
