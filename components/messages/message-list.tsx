import { useUserMessages } from "./message-provider";

export const MessageList = () => {
  const { userMessages } = useUserMessages();

  return (
    <div className="mb-2">
      {userMessages.map((msg, idx) => (
        <div key={idx}>{msg}</div>
      ))}
    </div>
  );
};
