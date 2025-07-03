import fs from "fs";

import { QAEntry, UsedEntry } from "@/lib/type";
import * as MSG from "../contents/messages";
import * as Utils from "../lib/utils";
import { qaEntriesFilePath } from "@/lib/path";

type AnswerNode = {
  usedEntry: UsedEntry[];
  host: string;
};

/**
 *
 * @param param0 回答や解説を行うノード
 * @returns
 */
export function explainAnswerNode({ usedEntry, host }: AnswerNode) {
  const contexts = [];
  contexts.push(MSG.BULLET + MSG.SUCCESS_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.SUMMARY_REQUEST_PROMPT);

  // ここで使用したエントリーの重みを変更
  if (usedEntry.length != 0) {
    const qaList: QAEntry[] = Utils.writeQaEntriesQuality(usedEntry, 0.1, host);
    fs.writeFileSync(qaEntriesFilePath(host), JSON.stringify(qaList, null, 2));
  }

  return { contexts };
}
