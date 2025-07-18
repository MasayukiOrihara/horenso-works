import { useChat } from "@ai-sdk/react";
import { useUserMessages } from "./message-provider";
import { useEffect, useRef } from "react";
import { UIMessage } from "ai";
import { LoaderCircleIcon } from "lucide-react";
import { useSwitches } from "../provider/switch-provider";
import { useStartButton } from "../provider/start-button-provider";

// useChatの共通化関数
function useMyChat(
  apiPath: string,
  memoryOn: boolean,
  learnOn: boolean,
  addPromptOn: boolean,
  debug: boolean,
  step: number
) {
  return useChat({
    api: apiPath,
    headers: {
      memoryOn: memoryOn.toString(),
      learnOn: learnOn.toString(),
      addPromptOn: addPromptOn.toString(),
      debug: debug.toString(),
      step: step.toString(),
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

export const MessageAi = ({ logs }: { logs: string[] }) => {
  const { userMessages, setAiMessage, currentUserMessage, setAiState } =
    useUserMessages();
  const { memoryOn, learnOn, addPromptOn } = useSwitches();
  const { started, debug, step } = useStartButton();
  const { messages, status, append } = useMyChat(
    "api/chat",
    memoryOn,
    learnOn,
    addPromptOn,
    debug,
    step
  );
  const lastLog = logs[logs.length - 1] ?? "AI を呼び出し中...";

  // システムの開始状態を管理
  const hasRun = useRef(false);

  // ユーザーメッセージの送信
  useEffect(() => {
    if (userMessages.length === 0) return;
    append({ role: "user", content: currentUserMessage });
  }, [userMessages]);

  // システムの開始処理
  useEffect(() => {
    // 初回の実行処理
    if (started && !hasRun.current) {
      hasRun.current = true;
      append({ role: "user", content: "研修よろしくお願いします。" });
    }
  }, [started]);

  // 直近のメッセージを取得
  const currentAiCommentMessage = getLatestAssistantMessage(messages);

  // 待機状況
  useEffect(() => {
    setAiState(status);

    // Aimessageの取得
    if (status === "ready" && messages.length != 0) {
      setAiMessage(currentAiCommentMessage.content);
    }
  }, [status]);

  return (
    <div className="w-full my-2 bg-white">
      <div className="w-full h-72 border-4 border-black border-double rounded p-2 text-blue-300 overflow-y-auto">
        {currentAiCommentMessage && (
          <div className="p-1" key={currentAiCommentMessage.id}>
            <span className="text-zinc-800 whitespace-pre-wrap">
              {currentAiCommentMessage.content}
            </span>
          </div>
        )}
        {status === "submitted" && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg mb-2 mx-8">
            <LoaderCircleIcon className="animate-spin h-6 w-6 text-gray-400" />
            <span className="text-gray-400">{lastLog}</span>
          </div>
        )}
      </div>
    </div>
  );
};
