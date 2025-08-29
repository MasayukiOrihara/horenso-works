import { Document } from "langchain/document";
import { v4 as uuidv4 } from "uuid";

import {
  ClueMetadata,
  QADocumentMetadata,
  QAEntry,
  UsedEntry,
} from "@/lib/type";
import { qaEntriesFilePath } from "@/lib/path";
import { readJson } from "@/lib/file/read";
import { AdjustedClue } from "../../../route";

/** clue 新規作成 */
export const generateClue = (
  userAnswer: string,
  question_id: string
): Document<ClueMetadata> => {
  return {
    pageContent: userAnswer,
    metadata: {
      id: uuidv4(),
      question_id: question_id,
      clue: "",
      quality: 0.5,
      source: "bot",
    },
  };
};

/** clue の quality の更新 */
export function updateClueQuality(adjustedClue: AdjustedClue[], qual: number) {
  const update: AdjustedClue[] = [];

  // 何もなければ空で返す
  if (!adjustedClue) {
    return update;
  }

  // 値の更新
  for (const clue of adjustedClue) {
    const correntQuality = clue.quality;
    const newQuality = Math.min(1.0, Math.max(0.0, correntQuality + qual));

    clue.quality = newQuality;
    update.push(clue);
  }

  return update;
}

// /* エントリーの更新関数 */
// export function updateEntry(qaEntryId: string, text: string) {
//   // 既存データを読み込む（なければ空配列）
//   const qaList: QAEntry[] = readJson(qaEntriesFilePath());
//   // 数字を伏字にする（過去返答に引っ張られることが多いため）
//   const censored = text.replace(/\d/g, "*");

//   // 値の更新
//   const updated = qaList.map((qa) =>
//     qa.id === qaEntryId && qa.hint === ""
//       ? {
//           ...qa,
//           hint: censored,
//           metadata: {
//             ...qa.metadata,
//           },
//         }
//       : qa
//   );
//   // quenty 0.5以下かつ2週間前のbotデータは消滅させる
//   const now = new Date();
//   const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

//   const qaListFilter = updated.filter((item) => {
//     const timestamp = new Date(item.metadata.timestamp);
//     const isLowQuality = item.metadata.quality <= 0.5;
//     const isOld = timestamp < twoWeeksAgo;
//     const isBot = item.metadata.source === "bot";

//     // 3条件すべてに当てはまるものだけ除外
//     return !(isLowQuality && isOld && isBot);
//   });

//   // 上書き保存（整形付き）
//   fs.writeFileSync(qaEntriesFilePath(), JSON.stringify(qaListFilter, null, 2));
//   console.log(`✅ エントリーデータを ${qaEntriesFilePath()} に更新しました`);
// }

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

/* エントリーデータをdocument用にマップする処理 */
export function buildQADocuments(
  qaList: QAEntry[],
  step: number
): Document<QADocumentMetadata>[] {
  return qaList
    .filter((qa) => qa.metadata.question_id === String(step + 1))
    .map((qa) => ({
      pageContent: qa.userAnswer,
      metadata: {
        hint: qa.hint,
        id: qa.id,
        ...qa.metadata,
      },
    }));
}
