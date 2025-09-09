import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/FramedCard";
import { useErrorStore } from "@/hooks/useErrorStore";
import { useSessionId } from "@/hooks/useSessionId";
import { requestApi } from "@/lib/api/request";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import * as ERR from "@/lib/message/error";
import { CLUELIST_LOAD_PATH } from "@/lib/api/path";
import { useSessionFlags } from "@/components/provider/SessionFlagsProvider";

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
  // 更新できるかどうかのフラグ
  const [isUpdatable, setIsUpdatable] = useState(false);
  // 現在のセッション ID
  const sessionId = useSessionId();
  // clueId 取得
  const { value: sessionFlags } = useSessionFlags();
  const clueId = sessionFlags.options.clueId;
  const { push } = useErrorStore();

  // 前のメッセージを取得
  useEffect(() => {
    // 設定を開いたときのみ
    if (!sessionId || !open) return;

    // clue がまだない
    if (!clueId) {
      const message: LatestMessages = {
        user: "返答例を取得できませんでした",
        assistant: "",
      };
      setLatestMessages(message); // ← ここで state 更新（非同期）
      setIsUpdatable(false);
      console.log(isUpdatable);
      return;
    }

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
        setIsUpdatable(true);
      } catch (error) {
        setIsUpdatable(false);
        toast.error(`${ERR.FATAL_ERROR}\n${ERR.RELOAD_BROWSER}`);

        const message =
          error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
        const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
        console.error(message);
        push({ message: ERR.ADD_RESPONSE_ERROR, detail: stack || message });
      }
    })();
  }, [sessionId, clueId, open, push]);

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
            <p className="text-xs">{latestMessages?.user}</p>
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
                disabled={!isUpdatable}
              />
            </label>

            {/** ボタン設定 */}
            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={onClose} className="hover:cursor-pointer">
                キャンセル
              </Button>
              <Button
                type="submit"
                className="hover:cursor-pointer"
                disabled={!isUpdatable}
              >
                更新
              </Button>
            </div>
          </form>
        </FramedCard>
      </div>
    </div>
  );
}
