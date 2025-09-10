import { FramedCard } from "@/components/ui/FramedCard";
import { useErrorStore } from "@/hooks/useErrorStore";
import { LIST_ALLLOAD_PATH } from "@/lib/api/path";
import { requestApi } from "@/lib/api/request";
import * as ERR from "@/lib/message/error";
import { DocumentsList, HorensoMetadata } from "@/lib/type";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// 定数
const PAGE_SIZE = 10;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FuzzyListModal({ open, onClose }: Props) {
  const [list, setList] = useState<DocumentsList[]>([]);
  const [page, setPage] = useState(1);
  const { push } = useErrorStore();
  const pushRef = useRef(push);
  useEffect(() => {
    pushRef.current = push;
  }, [push]);

  // リストの取得
  const lastFetchedLengthRef = useRef<number | null>(null);
  useEffect(() => {
    // 設定を開いたときのみ
    if (!open) return;

    // すでに取得済みなら再取得しない
    if (lastFetchedLengthRef.current === list.length) return;

    // BD から list を取得
    let cancelled = false;
    (async () => {
      try {
        const res: DocumentsList[] = await requestApi("", LIST_ALLLOAD_PATH, {
          method: "POST",
          body: { listName: "fuzzylist" },
        });
        if (cancelled) return;

        // 型が曖昧なら安全に取り出す
        const next: DocumentsList[] = (res ?? []).map((v) => {
          const id = String(v?.id ?? "");
          const content = String(v?.content ?? "");
          const metadata: HorensoMetadata = v?.metadata ?? {};

          return { id, content, metadata };
        });

        setList(next);
        lastFetchedLengthRef.current = list.length;
      } catch (error) {
        toast.error(`${ERR.FATAL_ERROR}\n${ERR.RELOAD_BROWSER}`);

        const message =
          error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
        const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
        console.error(message);
        pushRef.current({
          message: ERR.ADD_RESPONSE_ERROR,
          detail: stack || message,
        });
      }
    })();

    return () => {
      cancelled = true; // 早閉じ/再オープンでの setState を抑止
    };
  }, [list, open]);

  // 総ページ数と表示範囲を計算
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, list.length);
  const current = list.slice(start, start + PAGE_SIZE);

  // list の件数が減ってページがはみ出た時に丸める
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // モーダルを開いたら1ページ目に戻す
  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  if (!open) return null; // ← 閉じているときは何も描画しない

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* オーバーレイ（クリックで閉じる） */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 本体 */}
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2">
        <FramedCard title="あいまい正解リスト">
          <div className="space-y-3">
            <div className="text-sm text-gray-500">
              {list.length
                ? `${start + 1}–${end} / ${list.length} 件`
                : "データがありません"}
            </div>

            <div>
              {current.map((v) => (
                <div key={v.id} className="border rounded p-2 mb-2">
                  {v.content}
                </div>
              ))}
            </div>

            {list.length > PAGE_SIZE && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  « First
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  ‹ Prev
                </button>

                <span className="px-3">
                  Page {page} / {totalPages}
                </span>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Next ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Last »
                </button>
              </div>
            )}
          </div>
        </FramedCard>
      </div>
    </div>
  );
}
