import { readJson } from "../../chat/utils";
import { QAEntry, UsedEntry } from "@/lib/type";
import { qaEntriesFilePath, timestamp } from "@/lib/path";

/** 既存のデータを読み込み、使用したデータからqualityの値を更新する */
export function writeQaEntriesQuality(
  usedDocuments: UsedEntry[],
  qual: number
) {
  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = readJson(qaEntriesFilePath());

  let updated: QAEntry[] = qaList;
  for (const used of usedDocuments) {
    console.log("前回のID: " + used.entry.metadata.id);
    for (const list of qaList) {
      if (used.entry.metadata.id === list.id) {
        const current = used.entry.metadata.quality ?? 0.5;
        const newQuality = Math.min(1.0, Math.max(0.0, current + qual));

        // 値の更新
        updated = qaList.map((qa) =>
          qa.id === list.id
            ? {
                ...qa,
                metadata: {
                  ...qa.metadata,
                  quality: newQuality,
                },
              }
            : qa
        );
      }
    }
  }
  return updated;
}

/** エントリーデータ蓄積用 */
export const qaEntryData = (
  qaEntryId: string,
  answer: string,
  id: string
): QAEntry => {
  return {
    id: qaEntryId,
    userAnswer: answer,
    hint: "",
    metadata: {
      timestamp: timestamp,
      quality: 0.5,
      question_id: id,
      source: "bot",
    },
  };
};
