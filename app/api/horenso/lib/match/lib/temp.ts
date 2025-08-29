import { Document } from "langchain/document";
import { ClueMetadata, PhrasesMetadata, QAEntry } from "@/lib/type";
import { saveEmbeddingSupabase } from "./supabase";

/** 臨時：JSON ファイルを supabase に読ませる用 */
export const saveListDB = async (list: any, tableName: string) => {
  // 読み込み
  const doc = buildSupportDocsEntry(list);
  await saveEmbeddingSupabase(doc, tableName);
  if (Array.isArray(list) && list.length > 0) {
    // const phrasesWho = list.who.flat();
    // const phrasesWhy = list.why.flat();
    // const phrases = [...phrasesWho, ...phrasesWhy];
    // 変換
    //const doc = buildSupportDocsEX(phrases);
    // supabese にベクター変換 & 保存
    //await saveEmbeddingSupabase(doc, tableName);
  }
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
          timestamp: phrases.metadata.timestamp,
          rationale: phrases.reason,
          source: phrases.metadata.source,
        },
      })
  );

const buildSupportDocsEntry = (phrases: QAEntry[]): Document<ClueMetadata>[] =>
  phrases.map(
    (phrases) =>
      new Document<ClueMetadata>({
        pageContent: phrases.userAnswer,
        metadata: {
          id: phrases.id,
          question_id: phrases.metadata.question_id ?? "",
          clue: phrases.hint,
          quality: phrases.metadata.quality,
          source: phrases.metadata.source ?? "bot",
        },
      })
  );
