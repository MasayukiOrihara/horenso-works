"use client";
import { useEffect, useRef, useState } from "react";
import { useUserMessages } from "@/components/provider/MessageProvider";
import { LOAD_LATEST_PATH } from "@/lib/api/path";
import { requestApi } from "@/lib/api/request";

type BackfillOpts = {
  sessionId: string;
  endpoint?: string; // 例: "/api/history"
};

export function useBackfillAiMessage({
  sessionId,
  endpoint = LOAD_LATEST_PATH,
}: BackfillOpts) {
  useEffect(() => {
    async () => {
      try {
        const res = await requestApi(
          "",
          `${endpoint}?sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: "GET",
          }
        );
        console.log(res);
      } catch (error) {}
    };
  }, []);

  return;
  //   const { aiState, aiMessage, setAiMessage, addUserMessage, setAiState } =
  //     useUserMessages();
  //   const [loading, setLoading] = useState(false);
  //   const fetchedFor = useRef<string | null>(null);
  //   useEffect(() => {
  //     const needsBackfill =
  //       (aiState === "submitted" || aiState === "streaming") &&
  //       (!aiMessage || aiMessage.trim() === "");
  //     if (!needsBackfill) return;
  //     if (loading) return;
  //     if (fetchedFor.current === sessionId) return; // 同セッションで一度だけ
  //     const ac = new AbortController();
  //     setLoading(true);
  //     fetchedFor.current = sessionId;
  //     (async () => {
  //       try {
  //         const res = await fetch(
  //           `${endpoint}?sessionId=${encodeURIComponent(sessionId)}`,
  //           {
  //             signal: ac.signal,
  //             cache: "no-store",
  //           }
  //         );
  //         if (!res.ok) throw new Error(`fetch ${res.status}`);
  //         // 期待する返り値の例:
  //         // { lastAssistant: string, userMessages: string[] }
  //         const data = (await res.json()) as {
  //           lastAssistant?: string;
  //           userMessages?: string[];
  //         };
  //         // ユーザー履歴も戻したいなら
  //         if (Array.isArray(data.userMessages)) {
  //           for (const m of data.userMessages) addUserMessage(m);
  //         }
  //         if (!aiMessage && data.lastAssistant) {
  //           setAiMessage(data.lastAssistant);
  //         }
  //       } catch (e) {
  //         // 必要なら状態遷移
  //         setAiState("error");
  //         // console.error(e);
  //       } finally {
  //         setLoading(false);
  //       }
  //     })();
  //     return () => ac.abort();
  //   }, [
  //     aiState,
  //     aiMessage,
  //     sessionId,
  //     endpoint,
  //     loading,
  //     addUserMessage,
  //     setAiMessage,
  //     setAiState,
  //   ]);
}
