import { ToggleRow } from "../ui/ToggleRow";
import { FramedCard } from "../ui/FramedCard";
import React from "react";
import { ActionRow } from "../ui/ActionRow";
import { AddResponseExampleModal } from "./ResponseExamples/AddResponseExampleModal";
import { ThresholdModal } from "./Threshold/ThresholdModal";
import { ListModal } from "./List/ListMenuModal";
import { useSettings } from "../provider/SettingsProvider";

type SettingsModalProps = {
  label?: string;
  children?: React.ReactNode; // 必要なら自分で定義
};

type ModalKind = null | "add" | "threshold" | "list";

export const SettingsModal = ({}: SettingsModalProps) => {
  const [modal, setModal] = React.useState<ModalKind>(null);
  const { setInputTag, flags, setFlags } = useSettings();

  // 開く
  const openAdd = () => setModal("add");
  const openThreshold = () => setModal("threshold");
  const openList = () => setModal("list");
  // 閉じる
  const close = () => setModal(null);

  return (
    <div className="absolute z-10">
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
              onChange={(v) => setFlags((s) => ({ ...s, setCheckOn: v }))}
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
            <ActionRow title="判定の閾値を設定する…" onClick={openThreshold} />
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
            // ここで保存処理など
            console.log("submitted:", ex);
            close();
          }}
        />
        <ThresholdModal open={modal === "threshold"} onClose={close} />
        <ListModal open={modal === "list"} onClose={close} />
      </FramedCard>
    </div>
  );
};
