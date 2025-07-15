import fs from "fs";

import * as MSG from "../contents/messages";
import { QAEntry, UsedEntry } from "@/lib/type";
import { getBaseUrl, qaEntriesFilePath } from "@/lib/path";
import { writeQaEntriesQuality } from "../lib/entry";

/**
 *
 * @param param0 回答や解説を行うノード
 * @returns
 */
export function explainAnswerNode(usedEntry: UsedEntry[]) {
  const contexts = [];

  contexts.push("# 返答作成の手順\n\n");
  contexts.push(MSG.BULLET + MSG.SUCCESS_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.SUMMARY_REQUEST_PROMPT);

  // ここで使用したエントリーの重みを変更
  if (usedEntry.length != 0) {
    const qaList: QAEntry[] = writeQaEntriesQuality(usedEntry, 0.1);
    fs.writeFileSync(qaEntriesFilePath(), JSON.stringify(qaList, null, 2));
  }

  return { contexts };
}
