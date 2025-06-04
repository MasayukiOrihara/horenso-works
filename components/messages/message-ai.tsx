import { useChat } from "@ai-sdk/react";
import { useUserMessages } from "./message-provider";
import { useEffect } from "react";
import { UIMessage } from "ai";

// useChatの共通化関数
function useMyChat(apiPath: string) {
  return useChat({
    api: apiPath,
    onError: (error) => {
      console.log(error);
    },
  });
}

// 最後のメッセージを取り出す共通化関数
function getLatestAssistantMessage(messages: UIMessage[]) {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  return assistantMessages[assistantMessages.length - 1];
}

export const MessageAi = () => {
  const { userMessages } = useUserMessages();
  const { messages, append } = useMyChat("api/horenso");

  // ユーザーメッセージの送信
  useEffect(() => {
    if (userMessages.length === 0) return;
    const currentUserMessage = userMessages[userMessages.length - 1];

    append({ role: "user", content: currentUserMessage });
  }, [userMessages]);

  const currentAiCommentMessage = getLatestAssistantMessage(messages);

  return (
    <div className="w-full my-2 bg-white">
      <div className="w-full min-h-24 border-4 border-black border-double rounded p-2 text-blue-300">
        {currentAiCommentMessage && (
          <div className="p-1" key={currentAiCommentMessage.id}>
            <span className="text-zinc-800">
              {currentAiCommentMessage.content}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
