import { Document } from "langchain/document";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

import { supabaseClient } from "@/lib/clients";
import { embeddings } from "@/lib/llm/models";
import * as ERR from "@/lib/message/error";
import { ClueMetadata, PhrasesMetadata, QAEntry } from "@/lib/type";

/** ベクターデータで supabase から検索を行う */
export const searchEmbeddingSupabase = async (
  tableName: string,
  queryName: string,
  vectorData: number[],
  k: number,
  question_id: string
) => {
  // VectorStoreをSupabaseから設定
  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient(),
    tableName: tableName,
    queryName: queryName,
  });

  // 検索
  const result = await vectorStore.similaritySearchVectorWithScore(
    vectorData,
    k,
    { question_id: question_id } // RPC に渡る
  );

  // 検索結果が空の場合も考慮するならここでチェック
  if (!result || result.length === 0) {
    throw new Error(ERR.SUPABASE_NO_RESULT_ERROR);
  }
  return result;
};

/** supabase にドキュメントを埋め込む */
export async function saveEmbeddingSupabase(
  documets: Document[],
  tableName: string
) {
  try {
    // ストアの作成
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient(),
      tableName: tableName,
      queryName: "",
    });

    // ドキュメントの追加
    await vectorStore.addDocuments(documets);
  } catch (error) {
    throw new Error(`${ERR.SUPABASE_STORE_ERROR} ${error}`);
  }
  console.log("supabade への登録完了");
}

/** supabase でメタデータの更新を行う */
export async function updateMetadataSupabase(
  id: string,
  targetKey: string,
  newValue: number
) {
  const { error } = await supabaseClient().rpc(
    "update_metadata_key_by_metaid",
    {
      meta_id: id,
      key: targetKey,
      value: JSON.stringify(newValue), // jsonbなので文字列化して渡す
    }
  );

  if (error) {
    console.error("supabade の更新エラー:", error);
  } else {
    console.log("supabade への更新成功:", id);
  }
}

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
