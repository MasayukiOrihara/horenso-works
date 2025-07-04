import { BaseMessage } from "@langchain/core/messages";

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
