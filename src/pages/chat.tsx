import {
  Devvit,
  Context,
  useState,
  useForm,
  useAsync,
} from "@devvit/public-api";
import { chatWithAI } from "../server/utils.js";

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
  riddle,
  post,
}: {
  setPage: (page: string) => void;
  context: Context;
  gameId: string;
  setGameId: (gameId: string) => void;
  stage: number;
  history: history[];
  setHistory: (history: (prevHistory: history[]) => history[]) => void;
  riddle: any;
  post: any;
}) => {
  const { reddit } = context;
  const [message, setMessage] = useState("");

  const { data: username } = useAsync(async () => {
    const user = await reddit.getCurrentUser();
    return user?.username as string;
  }, { depends: [] });
  
  useAsync(
    async () => {
      if(message.trim().length === 0)
        return "";
      
      const assistantResponse = (await chatWithAI(context, riddle, post, history, message))?.message;
      console.log(assistantResponse);

      return assistantResponse as string;
    },
    {
      depends: [message],
      finally: (data) => {
        if (data) {
          setHistory((prevHistory) => [
            ...prevHistory,
            { from: "assistant", text: data as string },
          ]);
          setMessage("")
        }
      },
    },
  );

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

      setHistory((prevHistory) => [
        ...prevHistory,
        { from: username || "user", text: userMessage },
      ]);

      setMessage(userMessage);
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
        {history?.map((msg, index) => {
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
