import { useSessionFlags } from "@/components/provider/SessionFlagsProvider";
import { Button } from "@/components/ui/button";
import { FramedCard } from "@/components/ui/FramedCard";
import { ThresholdRow } from "@/components/ui/ThresholdRow";
import { DEFAULT_SCORE } from "@/lib/contents/defaultValue/threshold";

import { THRESHOLDS_SUCCESS } from "@/lib/message/success";
import { THRESHOLDS_WARNING } from "@/lib/message/warning";
import { MatchThreshold } from "@/lib/type";

import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ThresholdModal({ open, onClose }: Props) {
  // 閾値 を管理
  const { value: sessionFlags, mergeOptions } = useSessionFlags();

  // form コントロール
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MatchThreshold>({
    defaultValues: sessionFlags.options.threshold,
    mode: "onChange",
  });

  if (!open) return null; // ← 閉じているときは何も描画しない

  const onSubmit = (values: MatchThreshold) => {
    // 1) 保存（浅いマージなので threshold は“全体”を渡す）
    mergeOptions({ threshold: values });
    // 2) 通知
    toast.success(THRESHOLDS_SUCCESS);
    // 2) 閉じる
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* オーバーレイ（クリックで閉じる） */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* 本体 */}
      <div className="absolute left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2">
        <FramedCard title="判定の閾値を設定する">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            {/** base max */}
            <label className="block">
              <Controller
                name="maxBase"
                control={control}
                rules={{ required: true, min: 0, max: 1 }}
                render={({ field }) => (
                  <ThresholdRow
                    title="正解との一致度（上限）"
                    threshold={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.maxBase && (
                <p className="mt-1 text-xs text-red-500">
                  {THRESHOLDS_WARNING}
                </p>
              )}
            </label>

            {/** base min */}
            <label className="block">
              <Controller
                name="minBase"
                control={control}
                rules={{ required: true, min: 0, max: 1 }}
                render={({ field }) => (
                  <ThresholdRow
                    title="正解との一致度（下限）"
                    threshold={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.minBase && (
                <p className="mt-1 text-xs text-red-500">
                  {THRESHOLDS_WARNING}
                </p>
              )}
            </label>

            {/** wrong max */}
            <label className="block">
              <Controller
                name="maxWrong"
                control={control}
                rules={{ required: true, min: 0, max: 1 }}
                render={({ field }) => (
                  <ThresholdRow
                    title="間違い回答との一致度（上限）"
                    threshold={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.maxWrong && (
                <p className="mt-1 text-xs text-red-500">
                  {THRESHOLDS_WARNING}
                </p>
              )}
            </label>

            {/** fuzzy max */}
            <label className="block">
              <Controller
                name="maxFuzzy"
                control={control}
                rules={{ required: true, min: 0, max: 1 }}
                render={({ field }) => (
                  <ThresholdRow
                    title="あいまい回答との一致度（上限）"
                    threshold={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.maxFuzzy && (
                <p className="mt-1 text-xs text-red-500">
                  {THRESHOLDS_WARNING}
                </p>
              )}
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => reset(DEFAULT_SCORE)}
                className="hover:cursor-pointer"
                variant="ghost"
              >
                既定値に戻す
              </Button>
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
