import { Document } from "langchain/document";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

import * as MSG from "../contents/messages";
import * as Utils from "../lib/utils";
import { QAEntry, UsedEntry } from "@/lib/type";
import { BaseMessage } from "@langchain/core/messages";
import { qaEntriesFilePath } from "@/lib/path";

type RerankNode = {
  usedEntry: UsedEntry[];
  host: string;
  messages: BaseMessage[];
  step: number;
  qaEmbeddings: [Document<Record<string, any>>, number][];
};

export function rerankNode({
  usedEntry,
  host,
  messages,
  step,
  qaEmbeddings,
}: RerankNode) {
  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = Utils.writeQaEntriesQuality(usedEntry, -0.1, host);

  // エントリーデータ蓄積用
  const qaEntryId = uuidv4();
  const qaEntry: QAEntry = Utils.qaEntryData(
    qaEntryId,
    Utils.messageToText(messages, messages.length - 1),
    `${step + 1}`
  );

  // 新しいエントリを追加 + 上書き保存（整形付き）
  qaList.push(qaEntry);
  fs.writeFileSync(qaEntriesFilePath(host), JSON.stringify(qaList, null, 2));

  const contexts = [];
  contexts.push(MSG.BULLET + MSG.PAST_REPLY_HINT_PROMPT);
  contexts.push(MSG.ANSWER_EXAMPLE_PREFIX_PROMPT);

  // データ取得
  const rankedResults: UsedEntry[] = Utils.getRankedResults(qaEmbeddings);

  // sum の高い順に並べて、上位2件を取得
  usedEntry = rankedResults.sort((a, b) => b.sum - a.sum).slice(0, 2);
  for (const result of usedEntry) {
    console.log("エントリートップ2: " + result.entry.metadata.id);
    contexts.push(`${result.entry.metadata.hint}\n ***** \n`);
  }
  contexts.push("\n");

  return { qaEntryId, usedEntry, contexts };
}
