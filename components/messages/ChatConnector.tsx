import { useUserMessages } from "../provider/MessageProvider";
import { useCallback, useEffect, useRef } from "react";
import { UIMessage } from "ai";
import { useSessionId } from "@/hooks/useSessionId";
import { useHorensoChat } from "@/hooks/useHorensoChat";
import { useSessionFlags } from "../provider/SessionFlagsProvider";

// 定数
const FIRST_CHAT = "研修よろしくお願いします。";

// 最後のメッセージを取り出す共通化関数
function getLatestAssistantMessage(messages: UIMessage[]) {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  return assistantMessages[assistantMessages.length - 1];
}

export const ChatConnector = () => {
  const { setAiMessage, currentUserMessage, setChatStatus } = useUserMessages();
  const {
    value: sessionFlags,
    setValue: setSessionFlags,
    merge,
  } = useSessionFlags();
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

  // 初回の実行処理
  const hasRun =
    sessionFlags.sync !== "idle" && sessionFlags.phase === "locked";
  const isDebugOnRef = useRef(sessionFlags.options.debugOn);
  useEffect(() => {
    if (hasRun && !isDebugOnRef.current) {
      // 初めの送信
      send(FIRST_CHAT);
    }
  }, [hasRun, send]);

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
    // AIメッセージを受け取ったので状態をlocalに変更
    merge({ sync: "local" });
  }, [currentAiCommentMessage, setAiMessage]);

  // 待機状況の送信
  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);

  return null;
};
