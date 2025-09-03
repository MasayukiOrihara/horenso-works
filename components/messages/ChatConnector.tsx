import { useUserMessages } from "./message-provider";
import { useEffect, useRef } from "react";
import { UIMessage } from "ai";
import { useStartButton } from "../provider/StartButtonProvider";
import { useSessionId } from "@/hooks/useSessionId";
import { useHorensoChat } from "@/hooks/useHorensoChat";
import { useSettings } from "../provider/SettingsProvider";
import { ChatRequestOptions } from "@/lib/schema";
import { useSendCount } from "@/hooks/useSentCount";
import { Session } from "@/lib/type";

// 定数
const FIRST_CHAT = "研修よろしくお願いします。";

// 最後のメッセージを取り出す共通化関数
function getLatestAssistantMessage(messages: UIMessage[]) {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  return assistantMessages[assistantMessages.length - 1];
}

export const ChatConnector = () => {
  const { setAiMessage, currentUserMessage, setAiState } = useUserMessages();
  const { flags } = useSettings();
  const { startButtonFlags } = useStartButton();
  // 現在のセッション ID
  const sessionId = useSessionId();
  // 現在のセッション中に何回 LLM に送っているか
  const { count, increment } = useSendCount();
  // チャットリクエストのオプションを作成
  const options: ChatRequestOptions = {
    memoryOn: flags.memoryOn,
    debug: startButtonFlags.debug,
    step: startButtonFlags.step,
  };

  // session 情報の作成
  const session: Session | null =
    sessionId !== null ? { id: sessionId, count } : null;

  // カスタムフックから報連相ワークAI の準備
  const { messages, status, append } = useHorensoChat(
    "api/chat",
    session,
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
    if (startButtonFlags.started && !hasRun.current) {
      hasRun.current = true;
      appendRef.current({
        role: "user",
        content: FIRST_CHAT,
      });
    }
  }, [startButtonFlags.started]);

  // ユーザーメッセージの送信
  useEffect(() => {
    if (!currentUserMessage) return;
    appendRef.current({ role: "user", content: currentUserMessage });
    // 送信回数を増やす
    increment();
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
