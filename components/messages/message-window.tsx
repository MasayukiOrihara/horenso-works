import { Dialog } from "../window/dialog";
import { useUserMessages } from "../provider/MessageProvider";
import { useEffect, useRef, useState } from "react";
import { useBackfillAiMessage } from "@/hooks/useBackfillAiMessage";
import { useSessionFlags } from "../provider/SessionFlagsProvider";
import { requestApi } from "@/lib/api/request";
import { LOAD_LATEST_PATH } from "@/lib/api/path";

export const MessageWindow = () => {
  const [lines, setLines] = useState<string[]>([]);
  const { aiMessage, chatStatus } = useUserMessages();
  const { value: sessionFlags, setValue: setSessionFlags } = useSessionFlags();

  /* メッセージ関係 */
  useEffect(() => {
    // aiメッセージの取得
    if (aiMessage) {
      onStreamData(aiMessage);
      return; // 終了
    }

    console.log(sessionFlags);

    // 初回じゃない判定
    if (sessionFlags.sync !== "idle") {
      console.log("初回じゃない");
      console.log(sessionFlags.sessionId);

      (async () => {
        try {
          console.log("a");
          const res = await requestApi(
            "",
            `${LOAD_LATEST_PATH}?sessionId=${encodeURIComponent(
              sessionFlags.sessionId
            )}`,
            {
              method: "GET",
            }
          );
          console.log(res);
        } catch (error) {
          console.error(error);
        }
      })();
    }

    // useBackfillAiMessage({ sessionId: params.sessionId });

    console.log(aiMessage);
    console.log("kokom");
  }, [aiMessage, sessionFlags]);

  // 文章を改行で分離するための関数(最後の分は別で検知)
  const previousRef = useRef<string>("");
  function onStreamData(chunk: string) {
    let parts: string[] = [];
    // 用済みの文章を切断
    const sliceChunk = chunk.slice(previousRef.current.length);

    // 新たに改行があったら保存 + 空白は除去
    if (sliceChunk.includes("\n")) {
      parts = chunk.split("\n").filter(Boolean);
      previousRef.current = chunk;
    }

    if (parts.length > 0) {
      setLines((prev) => [...prev, parts[parts.length - 1]]);
    }
  }

  useEffect(() => {
    // 最後の一行の取得
    if (aiMessage && chatStatus === "ready") {
      const sliceChunk = aiMessage.slice(previousRef.current.length);
      setLines((prev) => [...prev, sliceChunk]);
    }
    // 初期化
    if (aiMessage && chatStatus === "submitted") {
      setLines([]);
      previousRef.current = "";
    }
  }, [chatStatus, aiMessage]);

  return (
    <div>
      <Dialog lines={lines} />
    </div>
  );
};
