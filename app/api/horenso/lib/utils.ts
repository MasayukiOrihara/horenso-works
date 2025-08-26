import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";

import { HorensoMetadata } from "@/lib/type";
import { Evaluation } from "./match/route";

/** メッセージ形式をStringに変換する関数 */
export function messageToText(message: BaseMessage[], index: number) {
  const result =
    typeof message[index].content === "string"
      ? message[index].content
      : message[index].content
          .map((c: { type?: string; text?: string }) => c.text ?? "")
          .join("");

  return result;
}

/**
 * isMatched の値が変化した要素だけを抽出する関数
 * @param before
 * @param after
 * @returns
 */
export function findMatchStatusChanges(
  before: Document<HorensoMetadata>[],
  after: Document<HorensoMetadata>[]
) {
  return before.filter((beforeItem) => {
    const afterItem = after.find(
      (a) => a.metadata.parentId === beforeItem.metadata.parentId
    );
    return (
      afterItem &&
      beforeItem.metadata.isMatched !== afterItem.metadata.isMatched
    );
  });
}

// evaluationData から正解した問題の結果を反映
export const evaluatedResults = (
  evaluationData: Evaluation[],
  documents: Document<HorensoMetadata>[]
) => {
  for (const data of evaluationData) {
    documents.forEach((doc) => {
      if (data.document.metadata.parentId === doc.metadata.parentId) {
        if (data.document.metadata.isMatched) {
          doc.metadata.isMatched = data.document.metadata.isMatched; // ← 更新
        }
      }
    });
  }
};
