import { useEffect, useMemo, useState } from "react";
import { LoaderCircleIcon } from "lucide-react";
import { ChevronsLeft } from "lucide-react";
import { useUserMessages } from "../messages/message-provider";
import { LogViewer } from "./logViewer";
import { Typewriter } from "./typewriter";

export const Dialog = ({ lines }: { lines: string[] }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [seenPages, setSeenPages] = useState<number[]>([0]);
  const { aiState } = useUserMessages();

  /* ページネーション */
  const handleNext = () => {
    if (page === lines.length - 1) {
      setPage(0); // 最初に戻る
    } else {
      setPage(page + 1);
    }
    // 表示済み
    if (!seenPages.includes(page)) {
      setSeenPages((prev) => [...prev, page]);
    }
  };
  const handlePrev = () => {
    if (page > 0) setPage(page - 1);
  };

  // ページの初期化
  useEffect(() => {
    if (lines.length === 0 && aiState === "streaming") {
      setPage(0);
      setSeenPages([]);
    }
  }, [aiState]);

  /* ログの処理 */
  const lastLog = logs[logs.length - 1] ?? "AI を呼び出し中...";

  /* ページネーション用 */
  const colors = [
    "text-red-500",
    "text-green-500",
    "text-blue-500",
    "text-yellow-500",
    "text-purple-500",
  ];

  // 文字列を固定
  const currentText = useMemo(() => lines[page], [lines, page]);

  return (
    <div className="w-full my-2">
      {/* メッセージウィンドウ */}
      <div className=" bg-white w-full h-44 border-6 border-black border-double rounded-md p-2 overflow-y-auto">
        {lines?.[page] && (
          <div className="p-1">
            <span className="text-zinc-800 whitespace-pre-wrap">
              {seenPages.includes(page) ? (
                currentText
              ) : (
                <Typewriter text={currentText} speed={30} />
              )}
            </span>
          </div>
        )}
        {(aiState === "submitted" ||
          (aiState === "streaming" && lines.length === 0)) && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg mb-2 mx-8">
            <LoaderCircleIcon className="animate-spin h-6 w-6 text-gray-400" />
            <span className="text-gray-400">{lastLog}</span>
          </div>
        )}
      </div>

      {/* ページネーション */}
      <div className=" bg-white flex justify-between items-center mt-1.5">
        {/* 左ボタン */}
        <button
          onClick={handlePrev}
          disabled={
            page === 0 || (lines.length === 0 && aiState === "streaming")
          }
          className="px-4 py-2 w-[20%] border-y-6 border-l-6 border-black border-double rounded-md rounded-r-none hover:cursor-pointer hover:opacity-60 disabled:cursor-auto disabled:opacity-40"
        >
          ◀
        </button>
        {/* 真ん中要素 */}
        <div className="w-full h-full mx-1 px-4 py-2 border-6 border-black border-double">
          <div className="flex my-1 m-auto w-fit gap-1">
            {Array.from({ length: lines.length }).map((_, i) => {
              const isSeen = seenPages.includes(i);
              const colorClass = isSeen
                ? "text-zinc-600"
                : colors[i % colors.length];
              return (
                <span key={i} className={`text-xs ${colorClass}`}>
                  {i === page ? "●" : "○"}
                </span>
              );
            })}
            <span className={"text-xs invisible"}>
              {lines.length === 0 ? "○" : ""}
            </span>
          </div>
        </div>
        {/* 右ボタン */}
        <button
          onClick={handleNext}
          disabled={
            lines.length === 0 ||
            (lines.length === 0 && aiState === "streaming")
          }
          className="px-4 py-2 w-[20%] border-y-6 border-r-6 border-black border-double rounded-md rounded-l-none hover:cursor-pointer hover:opacity-60 disabled:cursor-auto disabled:opacity-40"
        >
          {page === lines.length - 1 ? (
            <ChevronsLeft className="w-6 h-6" />
          ) : (
            "▶"
          )}
        </button>
      </div>
      <LogViewer onSend={(log) => setLogs(log)} />
    </div>
  );
};
