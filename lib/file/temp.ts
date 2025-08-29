import { Document } from "langchain/document";
import { PhrasesMetadata } from "@/lib/type";
import { saveEmbeddingSupabase } from "../../app/api/horenso/lib/match/lib/supabase";
import { readJson } from "@/lib/file/read";

/** 臨時：JSON ファイルを supabase に読ませる用 */
export const saveListDB = async () => {
  // 読み込み
  const list = readJson(
    "C:/localgit/horenso-works/public/semantic/semantic-match-answer.json"
  );

  // const list = readJson(
  //   "C:/localgit/horenso-works/public/semantic/not-correct.json"
  // );
  console.log(list);
  const phrasesWho = list.who.flat();
  const phrasesWhy = list.why.flat();
  const phrases = [...phrasesWho, ...phrasesWhy];

  // // 変換
  const doc = buildSupportDocsEX(phrases);
  // // supabese にベクター変換 & 保存
  await saveEmbeddingSupabase(doc, "fuzzylist");

  // const doc = buildSupportDocsEntry(list);
  // await saveEmbeddingSupabase(doc, tableName);
};
const buildSupportDocsEX = (phrases: any[]): Document<PhrasesMetadata>[] =>
  phrases.map(
    (phrases) =>
      new Document<PhrasesMetadata>({
        pageContent: phrases.answer,
        metadata: {
          id: phrases.id,
          question_id: phrases.metadata.question_id,
          parentId: String(phrases.metadata.parentId),
          rationale: phrases.reason,
          source: phrases.metadata.source,
        },
      })
  );

// const buildSupportDocsEntry = (phrases: QAEntry[]): Document<ClueMetadata>[] =>
//   phrases.map(
//     (phrases) =>
//       new Document<ClueMetadata>({
//         pageContent: phrases.userAnswer,
//         metadata: {
//           id: phrases.id,
//           question_id: phrases.metadata.question_id ?? "",
//           clue: phrases.hint,
//           quality: phrases.metadata.quality,
//           source: phrases.metadata.source ?? "bot",
//         },
//       })
//   );
