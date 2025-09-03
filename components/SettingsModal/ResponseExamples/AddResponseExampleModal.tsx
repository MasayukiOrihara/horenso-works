import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/FramedCard";
import { useClueId } from "@/hooks/useClueId";
import { useErrorStore } from "@/hooks/useErrorStore";
import { useSessionId } from "@/hooks/useSessionId";
import { requestApi } from "@/lib/api/request";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as ERR from "@/lib/message/error";
import { CLUELIST_LOAD_PATH } from "@/lib/api/path";

export type ResponseExample = {
  id?: string | null;
  updatedContent: string;
};
type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (example: ResponseExample) => void;
};

type LatestMessages = { user: string; assistant: string };

/**
 * 返答例を追加するモーダル
 * @param param0
 * @returns
 */
export function AddResponseExampleModal({ open, onClose, onSubmit }: Props) {
  // 受け取った LatestMessage を管理
  const [latestMessages, setLatestMessages] = useState<LatestMessages | null>();
  // 現在のセッション ID
  const sessionId = useSessionId();
  // clueId 取得
  const { clueId } = useClueId();
  const { push } = useErrorStore();

  // 前のメッセージを取得
  useEffect(() => {
    // 設定を開いたときのみ
    if (!sessionId || !open) return;
    console.log(clueId);

    // 直前メッセージを BD から取得
    (async () => {
      try {
        const res = await requestApi("", `${CLUELIST_LOAD_PATH}${clueId}`, {
          method: "GET",
        });
        // 型チェックしてない
        const message: LatestMessages = {
          user: res.content,
          assistant: res.metadata.clue.replace(/["\\n]/g, ""),
        };

        setLatestMessages(message); // ← ここで state 更新（非同期）
      } catch (error) {
        toast.error(`${ERR.FATAL_ERROR}\n${ERR.RELOAD_BROWSER}`);

        const message =
          error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
        const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
        push({ message: ERR.USERPROFILE_SEND_ERROR, detail: stack || message });
      }
    })();
  }, [sessionId, open]);

  if (!open) return null; // ← 閉じているときは何も描画しない

  // 提出するハンドラー
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // 更新
    onSubmit({
      id: clueId,
      updatedContent: String(fd.get("content") || ""),
    });
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* オーバーレイ（クリックで閉じる） */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 本体 */}
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2">
        <FramedCard title="返答例を追加" align="left">
          {/** ユーザーメッセージを表示 */}
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              前回のユーザーメッセージ
            </span>
            <div>{latestMessages?.user}</div>
          </label>

          <form onSubmit={handleSubmit} className="mt-2 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">内容</span>
              <textarea
                name="content"
                className="w-full rounded-md border px-3 py-2"
                rows={6}
                required
                defaultValue={latestMessages?.assistant}
              />
              <p className="text-xs text-zinc-500 text-right">
                会話履歴を保存してない場合、前回メッセージは取得できません
              </p>
            </label>

            {/** ボタン設定 */}
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={onClose} className="hover:cursor-pointer">
                キャンセル
              </Button>
              <Button type="submit" className="hover:cursor-pointer">
                更新
              </Button>
            </div>
          </form>
        </FramedCard>
      </div>
    </div>
  );
}
