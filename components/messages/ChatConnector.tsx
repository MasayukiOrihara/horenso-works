import { useUserMessages } from "./message-provider";
import { useEffect, useRef, use } from "react";
import { UIMessage } from "ai";
import { useStartButton } from "../provider/StartButtonProvider";
import { useSessionId } from "@/hooks/useSessionId";
import { useHorensoChat } from "@/hooks/useHorensoChat";
import { useSettings } from "../provider/SettingsProvider";
import { ChatRequestOptions } from "@/lib/schema";
import { toast } from "sonner";
import * as ERR from "@/lib/message/error";
import { useErrorStore } from "@/hooks/useErrorStore";

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
  const { push } = useErrorStore();
  // 現在のセッション ID
  const sessionId = useSessionId();
  // チャットリクエストのオプションを作成
  const options: ChatRequestOptions = {
    memoryOn: flags.memoryOn,
    debug: startButtonFlags.debug,
    step: startButtonFlags.step,
  };

  // カスタムフックから報連相ワークAI の準備
  const { messages, status, append, error } = useHorensoChat(
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

  // エラー処理
  useEffect(() => {
    if (error) {
      toast.error(`${ERR.FATAL_ERROR}\n${ERR.RELOAD_BROWSER}`);

      const message =
        error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
      const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
      push({ message: ERR.USERPROFILE_SEND_ERROR, detail: stack || message });
    }
  }, [error]);

  return null;
};
