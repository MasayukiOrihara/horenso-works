import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

import * as MSG from "../contents/messages";
import { QAEntry, UsedEntry } from "@/lib/type";
import { qaEntriesFilePath } from "@/lib/path";
import { qaEntryData, writeQaEntriesQuality } from "../lib/entry";
import { messageToText } from "../lib/utils";
import { getRankedResults } from "../lib/match/score";

type RerankNode = {
  usedEntry: UsedEntry[];
  host: string;
  messages: BaseMessage[];
  step: number;
  qaEmbeddings: [Document<Record<string, any>>, number][];
};

/**
 * 参考にする過去回答を選出するノード
 * @param param0
 * @returns
 */
export function rerankNode({
  usedEntry,
  host,
  messages,
  step,
  qaEmbeddings,
}: RerankNode) {
  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = writeQaEntriesQuality(usedEntry, -0.1, host);

  // エントリーデータ蓄積用
  const qaEntryId = uuidv4();
  const qaEntry: QAEntry = qaEntryData(
    qaEntryId,
    messageToText(messages, messages.length - 1),
    `${step + 1}`
  );

  // 新しいエントリを追加 + 上書き保存（整形付き）
  qaList.push(qaEntry);
  fs.writeFileSync(qaEntriesFilePath(host), JSON.stringify(qaList, null, 2));

  const contexts = [];
  contexts.push(MSG.BULLET + MSG.PAST_REPLY_HINT_PROMPT);
  contexts.push(MSG.ANSWER_EXAMPLE_PREFIX_PROMPT);

  // データ取得
  const rankedResults: UsedEntry[] = getRankedResults(qaEmbeddings);

  // sum の高い順に並べて、上位2件を取得
  usedEntry = rankedResults.sort((a, b) => b.sum - a.sum).slice(0, 2);
  for (const result of usedEntry) {
    console.log("エントリートップ2: " + result.entry.metadata.id);

    const response = result.entry.metadata.hint.replace(/(\r\n|\n|\r)/g, "");
    contexts.push(`${response}\n --- \n`);
  }
  contexts.push("\n");

  return { qaEntryId, usedEntry, contexts };
}
