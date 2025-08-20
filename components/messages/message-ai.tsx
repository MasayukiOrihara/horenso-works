import { useUserMessages } from "./message-provider";
import { useEffect, useRef } from "react";
import { UIMessage } from "ai";
import { useSwitches } from "../provider/switch-provider";
import { useStartButton } from "../provider/start-button-provider";
import { useSessionId } from "@/hooks/useSessionId";
import { useHorensoChat } from "@/hooks/useHorensoChat";
import { ChatRequestOptions } from "@/lib/type";

// 最後のメッセージを取り出す共通化関数
function getLatestAssistantMessage(messages: UIMessage[]) {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  return assistantMessages[assistantMessages.length - 1];
}

export const MessageAi = () => {
  const { setAiMessage, currentUserMessage, setAiState } = useUserMessages();
  const { memoryOn, learnOn, addPromptOn } = useSwitches();
  const { started, debug, step } = useStartButton();
  // 現在のセッション ID
  const sessionId = useSessionId();
  // チャットリクエストのオプションを作成
  const options: ChatRequestOptions = {
    memoryOn,
    learnOn,
    addPromptOn,
    debug,
    step,
  };

  // カスタムフックから報連相ワークAI の準備
  const { messages, status, append } = useHorensoChat(
    "api/chat",
    sessionId,
    options
  );
  // append の状態を固定する
  const appendRef = useRef(append);
  useEffect(() => {
    appendRef.current = append;
  }, [append]);

  // システムの開始状態を管理
  const hasRun = useRef(false);
  // 直近のメッセージを取得
  const currentAiCommentMessage = getLatestAssistantMessage(messages);

  // システムの開始処理
  useEffect(() => {
    // 初回の実行処理
    if (started && !hasRun.current) {
      hasRun.current = true;
      appendRef.current({
        role: "user",
        content: "研修よろしくお願いします。",
      });
    }
  }, [started]);

  // ユーザーメッセージの送信
  useEffect(() => {
    if (!currentUserMessage) return;
    appendRef.current({ role: "user", content: currentUserMessage });
  }, [currentUserMessage]);

  // Aimessage の送信
  useEffect(() => {
    if (!currentAiCommentMessage) return;
    setAiMessage(currentAiCommentMessage.content);
  }, [currentAiCommentMessage, setAiMessage]);

  // 待機状況の送信
  useEffect(() => {
    setAiState(status);
  }, [status, setAiState]);

  return null;
};
