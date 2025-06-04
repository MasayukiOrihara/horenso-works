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

  const { messages: commentMessages, append: commentAppend } =
    useMyChat("api/comment");
  const { messages: teacherMessages, append: teacherAppend } =
    useMyChat("api/teacher");
  const { messages: freestyleMessages, append: freestyleAppend } =
    useMyChat("api/freestyle");

  // ユーザーメッセージの送信
  useEffect(() => {
    if (userMessages.length === 0) {
      commentAppend({
        role: "system",
        content:
          "userに記入を促してください。出だしは「こんにちは」で始めてください。",
      });
      return;
    }
    const currentUserMessage = userMessages[userMessages.length - 1];

    commentAppend({ role: "user", content: currentUserMessage });
    teacherAppend({ role: "user", content: currentUserMessage });
    freestyleAppend({ role: "user", content: currentUserMessage });
  }, [userMessages]);

  // AI1 コメントAI
  const currentAiCommentMessage = getLatestAssistantMessage(commentMessages);
  // AI2 情報AI
  const currentAiTeacherMessage = getLatestAssistantMessage(teacherMessages);
  // // AI3 フリースタイル社員AI
  const currentAiFreestyleMessage =
    getLatestAssistantMessage(freestyleMessages);

  return (
    <div className="w-full h-full">
      <div className="mb-2 text-blue-300">ここにAI💬</div>
      {currentAiCommentMessage && (
        <div
          className="my-2 py-2 px-6 bg-zinc-800/60 rounded"
          key={currentAiCommentMessage.id}
        >
          <span className="text-white">{currentAiCommentMessage.content}</span>
        </div>
      )}
      {currentAiTeacherMessage && (
        <div
          className="my-2 py-2 px-6 bg-zinc-800/60 rounded"
          key={currentAiTeacherMessage.id}
        >
          <span className="text-white">{currentAiTeacherMessage.content}</span>
        </div>
      )}
      {currentAiFreestyleMessage &&
        currentAiFreestyleMessage.content !== "関連性なし" && (
          <div
            className="my-2 py-2 px-6 bg-zinc-800/60 rounded"
            key={currentAiFreestyleMessage.id}
          >
            <span className="text-white">
              {currentAiFreestyleMessage.content}
            </span>
          </div>
        )}
    </div>
  );
};
