import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/FramedCard";
import { ThresholdRow } from "@/components/ui/ThresholdRow";
import { useSessionId } from "@/hooks/useSessionId";
import { MATCH_THRESHOLD } from "@/lib/api/path";
import { requestApi } from "@/lib/api/request";
import { MatchThreshold } from "@/lib/contents/match";
import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ThresholdModal({ open, onClose }: Props) {
  // 受け取った 閾値 を管理
  const [threshold, setThreshold] = useState<MatchThreshold | null>();
  // 現在のセッション ID
  const sessionId = useSessionId();

  // 閾値の設定を取得
  useEffect(() => {
    // 設定を開いたときのみ
    if (!sessionId || !open) return;

    // サーバーから閾値を取得
    (async () => {
      try {
        const res: MatchThreshold = await requestApi("", MATCH_THRESHOLD, {
          method: "GET",
        });

        setThreshold(res); // ← ここで state 更新（非同期）
      } catch (error) {
        console.warn(error);
      }
    })();
  }, [sessionId, open]);

  if (!open) return null; // ← 閉じているときは何も描画しない

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // この辺に保存処理 ※※ 未実装
  }

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* オーバーレイ（クリックで閉じる） */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 本体 */}
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2">
        <FramedCard title="判定の閾値を設定する">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/** base max */}
            <label className="block">
              <ThresholdRow
                title="正解との一致度（上限）"
                threshold={threshold?.maxBaseThreshold}
              />
            </label>

            {/** base min */}
            <label className="block">
              <ThresholdRow
                title="正解との一致度（下限）"
                threshold={threshold?.minBaseThreshold}
              />
            </label>

            {/** wrong max */}
            <label className="block">
              <ThresholdRow
                title="間違い回答との一致度（上限））"
                threshold={threshold?.maxWrongThreshold}
              />
            </label>

            {/** fuzzy max */}
            <label className="block">
              <ThresholdRow
                title="あいまい回答との一致度（上限））"
                threshold={threshold?.maxFuzzyThreshold}
              />
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={onClose} className="hover:cursor-pointer">
                キャンセル
              </Button>
              <Button type="submit" className="hover:cursor-pointer">
                保存
              </Button>
            </div>
          </form>
        </FramedCard>
      </div>
    </div>
  );
}
