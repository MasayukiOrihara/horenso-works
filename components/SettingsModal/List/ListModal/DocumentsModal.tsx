import { FramedCard } from "@/components/ui/FramedCard";
import { useErrorStore } from "@/hooks/useErrorStore";
import { LIST_ALLLOAD_PATH } from "@/lib/api/path";
import { requestApi } from "@/lib/api/request";
import * as ERR from "@/lib/message/error";
import { DocumentsList, HorensoMetadata } from "@/lib/type";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DocumentsModal({ open, onClose }: Props) {
  const [list, setList] = useState<DocumentsList[]>([]);
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
          body: { listName: "documents" },
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

  if (!open) return null; // ← 閉じているときは何も描画しない

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* オーバーレイ（クリックで閉じる） */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 本体 */}
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2">
        <FramedCard title="正解リスト">
          <div>
            {list &&
              list.map((v) => (
                <div key={v.id} className="text-sm">
                  {v.content}
                </div>
              ))}
          </div>
        </FramedCard>
      </div>
    </div>
  );
}
