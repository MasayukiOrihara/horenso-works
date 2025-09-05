import { ActionRow } from "@/components/ui/ActionRow";
import { FramedCard } from "@/components/ui/FramedCard";
import React from "react";
import * as MDL from "./ListModal/";

type Props = {
  open: boolean;
  onClose: () => void;
};

type ModalKind = null | "documents" | "fuzzy" | "wrong" | "clue";

export function ListModal({ open, onClose }: Props) {
  const [modal, setModal] = React.useState<ModalKind>(null);

  if (!open) return null; // ← 閉じているときは何も描画しない

  // 開く
  const openDocuments = () => setModal("documents");
  const openFuzzy = () => setModal("fuzzy");
  const openWrong = () => setModal("wrong");
  const openClue = () => setModal("clue");
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
      <div className="w-68 ml-58 mt-84">
        <FramedCard title="リストを更新する" align="center">
          <ul>
            <li>
              <ActionRow title="正解リスト…" onClick={openDocuments} />
            </li>
            <li>
              <ActionRow title="あいまい正解リスト…" onClick={openFuzzy} />
            </li>
            <li>
              <ActionRow title="間違いリスト…" onClick={openWrong} />
            </li>
            <li>
              <ActionRow title="返答の手がかり…" onClick={openClue} />
            </li>
          </ul>
        </FramedCard>

        <MDL.DocumentsModal open={modal === "documents"} onClose={close} />
        <MDL.FuzzyListModal open={modal === "fuzzy"} onClose={close} />
        <MDL.WrongListModal open={modal === "wrong"} onClose={close} />
        <MDL.ClueListModal open={modal === "clue"} onClose={close} />
      </div>
    </div>
  );
}
