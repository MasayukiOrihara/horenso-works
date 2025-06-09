import { useChat } from "@ai-sdk/react";
import { useMessages } from "./message-provider";
import { useEffect, useRef } from "react";
import { UIMessage } from "ai";
import { LoaderCircleIcon } from "lucide-react";

// useChatの共通化関数
function useMyChat(apiPath: string, memoryOn: boolean, learnOn: boolean) {
  return useChat({
    api: apiPath,
    headers: {
      memoryOn: memoryOn.toString(),
      learnOn: learnOn.toString(),
    },
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

export const MessageAi = ({
  started,
  memoryOn,
  learnOn,
}: {
  started: boolean;
  memoryOn: boolean;
  learnOn: boolean;
}) => {
  const { userMessages, addAiMessage, setAiState } = useMessages();
  const { messages, status, append } = useMyChat("api/chat", memoryOn, learnOn);
  const hasRun = useRef(false);

  // ユーザーメッセージの送信
  useEffect(() => {
    if (userMessages.length === 0) return;
    const currentUserMessage = userMessages[userMessages.length - 1];

    append({ role: "user", content: currentUserMessage });
  }, [userMessages]);

  // スタートボタン
  useEffect(() => {
    if (started && !hasRun.current) {
      hasRun.current = true;
      append({ role: "user", content: "研修よろしくお願いします。" });
    }
  }, [started]);

  // 待機状況
  useEffect(() => {
    setAiState(status);
  }, [status]);

  const currentAiCommentMessage = getLatestAssistantMessage(messages);

  useEffect(() => {
    if (currentAiCommentMessage && !(status === "streaming")) {
      addAiMessage(currentAiCommentMessage.content);
    }
  }, [currentAiCommentMessage]);

  return (
    <div className="w-full my-2 bg-white">
      <div className="w-full h-32 border-4 border-black border-double rounded p-2 text-blue-300 overflow-y-auto">
        {currentAiCommentMessage && (
          <div className="p-1" key={currentAiCommentMessage.id}>
            <span className="text-zinc-800">
              {currentAiCommentMessage.content}
            </span>
          </div>
        )}
        {status === "submitted" && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg mb-2 mx-8">
            <LoaderCircleIcon className="animate-spin h-6 w-6 text-gray-400" />
            <span className="text-gray-400">回答 確認中...</span>
          </div>
        )}
      </div>
    </div>
  );
};
