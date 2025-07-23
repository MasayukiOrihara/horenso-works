import { useChat } from "@ai-sdk/react";
import { useUserMessages } from "./message-provider";
import { useEffect, useRef } from "react";
import { UIMessage } from "ai";
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

export const MessageAi = () => {
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

  // システムの開始処理
  useEffect(() => {
    // 初回の実行処理
    if (started && !hasRun.current) {
      hasRun.current = true;
      append({ role: "user", content: "研修よろしくお願いします。" });
    }
  }, [started]);

  // システムの開始状態を管理
  const hasRun = useRef(false);
  // 直近のメッセージを取得
  const currentAiCommentMessage = getLatestAssistantMessage(messages);

  // ユーザーメッセージの送信
  useEffect(() => {
    if (userMessages.length === 0) return;
    append({ role: "user", content: currentUserMessage });
  }, [userMessages]);

  // Aimessage の送信
  useEffect(() => {
    if (messages.length != 0 && currentAiCommentMessage) {
      setAiMessage(currentAiCommentMessage.content);
    }
  }, [messages]);

  // 待機状況の送信
  useEffect(() => {
    setAiState(status);
  }, [status]);

  return null;
};
