import { LoaderCircleIcon } from "lucide-react";
import { useUserMessages } from "./message-provider";
import { useEffect, useRef, useState } from "react";
import { LogViewer } from "../debug/logViewer";

export const MessageWindow = () => {
  const { aiMessage, aiState } = useUserMessages();
  const [logs, setLogs] = useState<string[]>([]);
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
  }, [aiState]);

  /* ログの処理 */
  const lastLog = logs[logs.length - 1] ?? "AI を呼び出し中...";

  return (
    <div className="w-full my-2 bg-white">
      <div className="w-full h-72 border-4 border-black border-double rounded p-2 text-blue-300 overflow-y-auto">
        {aiMessage && lines && (
          <div className="p-1">
            <span className="text-zinc-800 whitespace-pre-wrap">{lines}</span>
          </div>
        )}
        {aiState === "submitted" && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg mb-2 mx-8">
            <LoaderCircleIcon className="animate-spin h-6 w-6 text-gray-400" />
            <span className="text-gray-400">{lastLog}</span>
          </div>
        )}
      </div>
      <LogViewer onSend={(log) => setLogs(log)} />
    </div>
  );
};
