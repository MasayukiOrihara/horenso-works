import { Switch } from "@/components/ui/switch";
import { useSwitches } from "../provider/switch-provider";
import { ToggleRow } from "../ui/ToggleRow";
import { FramedCard } from "../ui/FramedCard";
import React from "react";
import { ActionRow } from "../ui/ActionRow";

type SettingsModalProps = {
  label?: string;
  children?: React.ReactNode; // 必要なら自分で定義
};

export const SettingsModal = ({}: SettingsModalProps) => {
  const [examplesOpen, setExamplesOpen] = React.useState(false);
  const {
    setInputTag,
    memoryOn,
    setMemoryOn,
    addPromptOn,
    setAddPromptOn,
    checkOn,
    setCheckOn,
    shouldVidateOn,
    setShouldVidateOn,
  } = useSwitches();
  // ← これが「仮の」openExamplesDialog
  function openExamplesDialog() {
    setExamplesOpen(true);
  }

  // shouldの分解
  const whoShouldValidate = shouldVidateOn.who;
  const whyShouldValidate = shouldVidateOn.why;

  return (
    <div className="absolute z-10">
      <FramedCard title="設定" align="center">
        <ul>
          <li>
            {/* 会話履歴を保存する */}
            <ToggleRow
              title="会話履歴を保存する"
              checked={memoryOn}
              onChange={setMemoryOn}
            />
          </li>
          <li>
            {/* 正答判定を使用する */}
            <ToggleRow
              title="正答判定アンケートを使う"
              checked={checkOn}
              onChange={setCheckOn}
            />
          </li>
          {/* 回答が適正かどうかのチェックを使用する */}
          <li>AI による回答チェックを行う</li>
          <li>
            <ToggleRow
              title="1問目: 「誰が」"
              checked={whoShouldValidate}
              onChange={(value) =>
                setShouldVidateOn((prev) => ({ ...prev, who: value }))
              }
            />
            <ToggleRow
              title="2問目: 「なぜ」"
              checked={whyShouldValidate}
              onChange={(value) =>
                setShouldVidateOn((prev) => ({ ...prev, why: value }))
              }
            />
          </li>
          <li>
            <ActionRow
              title="返答例を追加する…"
              onClick={() => openExamplesDialog()}
            />
          </li>
          <li>
            <ActionRow
              title="判定の閾値を設定する…"
              onClick={() => openExamplesDialog()}
            />
          </li>
          <li>
            <ActionRow
              title="リストを更新する…"
              onClick={() => openExamplesDialog()}
            />
          </li>
        </ul>
      </FramedCard>
    </div>
  );
};
