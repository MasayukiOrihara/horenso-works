import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";

import { HorensoMetadata } from "@/lib/type";

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
