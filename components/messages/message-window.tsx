import { Dialog } from "../window/dialog";
import { useUserMessages } from "./message-provider";
import { useEffect, useRef, useState } from "react";

export const MessageWindow = () => {
  const { aiMessage, aiState } = useUserMessages();
  const [lines, setLines] = useState<string[]>([]);

  /* メッセージ関係 */
  useEffect(() => {
    // aiメッセージの取得
    if (aiMessage) {
      onStreamData(aiMessage);
    }
  }, [aiMessage]);

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
    if (aiMessage && aiState === "ready") {
      const sliceChunk = aiMessage.slice(previousRef.current.length);
      setLines((prev) => [...prev, sliceChunk]);
    }
    // 初期化
    if (aiMessage && aiState === "submitted") {
      setLines([]);
      previousRef.current = "";
    }
  }, [aiState]);

  return (
    <div>
      <Dialog lines={lines} />
    </div>
  );
};
