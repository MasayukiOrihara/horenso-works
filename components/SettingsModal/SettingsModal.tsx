import { ToggleRow } from "../ui/ToggleRow";
import { FramedCard } from "../ui/FramedCard";
import React from "react";
import { ActionRow } from "../ui/ActionRow";
import { AddResponseExampleModal } from "./ResponseExamples/AddResponseExampleModal";
import { ThresholdModal } from "./Threshold/ThresholdModal";
import { ListModal } from "./List/ListMenuModal";
import { useSettings } from "../provider/SettingsProvider";

type SettingsModalProps = {
  id: string;
  open: boolean;
  onClose: () => void;
};

type ModalKind = null | "add" | "threshold" | "list";

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const [modal, setModal] = React.useState<ModalKind>(null);
  const { flags, setFlags } = useSettings();

  if (!open) return null; // ← 閉じているときは何も描画しない

  // 開く
  const openAdd = () => setModal("add");
  const openThreshold = () => setModal("threshold");
  const openList = () => setModal("list");
  // 閉じる
  const close = () => setModal(null);

  return (
    <div
      className="fixed inset-0 z-30"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-72 ml-24 mt-14">
        <FramedCard title="設定" align="center">
          <ul>
            <li>
              {/* 会話履歴を保存する */}
              <ToggleRow
                title="会話履歴を保存する"
                checked={flags.memoryOn}
                onChange={(v) => setFlags((s) => ({ ...s, memoryOn: v }))}
              />
            </li>
            <li>
              {/* 正答判定を使用する */}
              <ToggleRow
                title="正答判定アンケートを使う"
                checked={flags.checkOn}
                onChange={(v) => setFlags((s) => ({ ...s, checkOn: v }))}
              />
            </li>
            {/* 回答が適正かどうかのチェックを使用する */}
            <li>AI による回答チェックを行う</li>
            <li>
              <ToggleRow
                title="1問目: 「誰が」"
                checked={flags.shouldValidate.who}
                onChange={(v) =>
                  setFlags((s) => ({
                    ...s,
                    shouldValidate: { ...s.shouldValidate, who: v },
                  }))
                }
              />
              <ToggleRow
                title="2問目: 「なぜ」"
                checked={flags.shouldValidate.why}
                onChange={(v) =>
                  setFlags((s) => ({
                    ...s,
                    shouldValidate: { ...s.shouldValidate, why: v },
                  }))
                }
              />
            </li>
            <li>
              <ActionRow title="返答例を追加する…" onClick={openAdd} />
            </li>
            <li>
              <ActionRow
                title="判定の閾値を設定する…"
                onClick={openThreshold}
              />
            </li>
            <li>
              <ActionRow title="リストを更新する…" onClick={openList} />
            </li>
          </ul>

          {/** 開くモーダル */}
          <AddResponseExampleModal
            open={modal === "add"}
            onClose={close}
            onSubmit={(ex) => {
              // 保存処理
              // cluelistを更新する
              console.log("submitted:", ex);
              close();
            }}
          />
          <ThresholdModal open={modal === "threshold"} onClose={close} />
          <ListModal open={modal === "list"} onClose={close} />
        </FramedCard>
      </div>
    </div>
  );
};
