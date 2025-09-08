import { ToggleRow } from "../ui/ToggleRow";
import { FramedCard } from "../ui/FramedCard";
import React, { useState } from "react";
import { ActionRow } from "../ui/ActionRow";
import {
  AddResponseExampleModal,
  ResponseExample,
} from "./ResponseExamples/AddResponseExampleModal";
import { ThresholdModal } from "./Threshold/ThresholdModal";
import { ListModal } from "./List/ListMenuModal";
import { requestApi } from "@/lib/api/request";
import { toast } from "sonner";
import * as ERR from "@/lib/message/error";
import { useErrorStore } from "@/hooks/useErrorStore";
import { CLUELIST_UPDATE_PATH } from "@/lib/api/path";
import { useSessionFlags } from "../provider/SessionFlagsProvider";

type SettingsModalProps = {
  id: string;
  open: boolean;
  onClose: () => void;
};

type ModalKind = null | "add" | "threshold" | "list";

export const SettingsModal = ({ open, onClose }: SettingsModalProps) => {
  const [modal, setModal] = useState<ModalKind>(null);
  const { push } = useErrorStore();
  const { value: sessionFlags, mergeOptions, setValidate } = useSessionFlags();

  if (!open) return null; // ← 閉じているときは何も描画しない

  // 開く
  const openAdd = () => setModal("add");
  const openThreshold = () => setModal("threshold");
  const openList = () => setModal("list");
  // 閉じる
  const close = () => setModal(null);

  // AddResponseExample の更新用
  async function handleAddResponseExampleSubmit(ex: ResponseExample) {
    // id が確認できなかったら更新しない
    if (!ex.id) {
      close();
      return;
    }

    try {
      // 保存処理(cluelistを更新する)
      await requestApi("", `${CLUELIST_UPDATE_PATH}${ex.id}`, {
        method: "PATCH",
        body: { clue: ex.updatedContent },
      });

      // 更新したら閉じる
      close();
      toast.success("返答例を更新しました");
    } catch (error) {
      toast.error(`${ERR.FATAL_ERROR}\n${ERR.RELOAD_BROWSER}`);

      const message =
        error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
      const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
      push({
        message: ERR.USERPROFILE_SEND_ERROR,
        detail: stack || message,
      });
    } finally {
      close();
    }
  }

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
                checked={sessionFlags.options.memoryOn}
                onChange={(v) => mergeOptions({ memoryOn: v })}
              />
            </li>
            <li>
              {/* 正答判定を使用する */}
              <ToggleRow
                title="正答判定アンケートを使う"
                checked={sessionFlags.options.questionnaireOn}
                onChange={(v) => mergeOptions({ questionnaireOn: v })}
              />
            </li>
            {/* 回答が適正かどうかのチェックを使用する */}
            <li>AI による回答チェックを行う</li>
            <li>
              <ToggleRow
                title="1問目: 「誰が」"
                checked={sessionFlags.options.aiValidateOn.who}
                onChange={(v) => setValidate("who", v)}
              />
              <ToggleRow
                title="2問目: 「なぜ」"
                checked={sessionFlags.options.aiValidateOn.why}
                onChange={(v) => setValidate("why", v)}
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
            onSubmit={(ex) => handleAddResponseExampleSubmit(ex)}
          />
          <ThresholdModal open={modal === "threshold"} onClose={close} />
          <ListModal open={modal === "list"} onClose={close} />
        </FramedCard>
      </div>
    </div>
  );
};
