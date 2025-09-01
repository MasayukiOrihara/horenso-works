import { FramedCard } from "@/components/ui/FramedCard";
export type ResponseExample = {
  id?: string;
  title: string;
  content: string;
};
type Props = {
  open: boolean;
  onClose: () => void;
};

export function ListModal({ open, onClose }: Props) {
  if (!open) return null; // ← 閉じているときは何も描画しない

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* オーバーレイ（クリックで閉じる） */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 本体 */}
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2">
        <FramedCard title="返答例を追加">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">タイトル</span>
              <input
                name="title"
                className="w-full rounded-md border px-3 py-2"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">内容</span>
              <textarea
                name="content"
                className="w-full rounded-md border px-3 py-2"
                rows={4}
                required
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border-2 border-black px-3 py-1 font-semibold hover:bg-slate-100 active:translate-y-px"
              >
                キャンセル
              </button>
              <button
                type="submit"
                className="rounded-md border-2 border-black bg-sky-500 px-3 py-1 font-semibold text-white hover:brightness-110 active:translate-y-px"
              >
                追加
              </button>
            </div>
          </form>
        </FramedCard>
      </div>
    </div>
  );
}
