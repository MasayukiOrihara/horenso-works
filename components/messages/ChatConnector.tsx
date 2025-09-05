import { useUserMessages } from "./message-provider";
import { useCallback, useEffect, useRef } from "react";
import { UIMessage } from "ai";
import { useStartButton } from "../provider/StartButtonProvider";
import { useSessionId } from "@/hooks/useSessionId";
import { useHorensoChat } from "@/hooks/useHorensoChat";
import { useSessionFlagsStorage } from "@/hooks/useSessionStorage";

// 定数
const FIRST_CHAT = "研修よろしくお願いします。";

// 最後のメッセージを取り出す共通化関数
function getLatestAssistantMessage(messages: UIMessage[]) {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  return assistantMessages[assistantMessages.length - 1];
}

export const ChatConnector = () => {
  const { setAiMessage, currentUserMessage, setAiState } = useUserMessages();
  const { startButtonFlags } = useStartButton();
  const { value: sessionFlags, setValue: setSessionFlags } =
    useSessionFlagsStorage();
  // 現在のセッション ID
  const sessionId = useSessionId();
  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // 最新の flags を送信用に持っておく
  const flagsRef = useRef(sessionFlags);
  useEffect(() => {
    flagsRef.current = sessionFlags;
  }, [sessionFlags]);

  // カスタムフックから報連相ワークAI の準備
  const { messages, status, append } = useHorensoChat("api/chat", sessionId, {
    onFlags: setSessionFlags, // ここでセッション情報の保存
  });

  // 状態を固定
  const appendRef = useRef(append);
  useEffect(() => {
    appendRef.current = append;
  }, [append]);

  // 常に「最新の flags」を body に入れて append する send ラッパ
  const send = useCallback((content: string) => {
    return appendRef.current(
      { role: "user", content },
      {
        body: {
          sessionId: sessionIdRef.current,
          sessionFlags: flagsRef.current,
        },
      }
    );
  }, []);

  // システムの開始状態を管理
  const hasRun = useRef(false);

  // 初回の実行処理
  useEffect(() => {
    if (startButtonFlags.started && !hasRun.current) {
      hasRun.current = true;
      send(FIRST_CHAT);
    }
  }, [startButtonFlags.started, send]);

  // ユーザーメッセージの送信
  useEffect(() => {
    if (!currentUserMessage) return;
    send(currentUserMessage);
  }, [currentUserMessage, send]);

  // Aimessage の送信
  const currentAiCommentMessage = getLatestAssistantMessage(messages);
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
