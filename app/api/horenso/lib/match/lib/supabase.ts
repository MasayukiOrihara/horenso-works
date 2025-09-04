import { Document } from "langchain/document";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

import { supabaseClient } from "@/lib/supabase/clients";

import * as ERR from "@/lib/message/error";
import { embeddings } from "@/lib/llm/embedding";
import { Similarities } from "@/lib/type";

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
  newValue: number | string
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

// グレードデータの親を作成する
export async function insertGradeSupabase(
  sessionId: string,
  questionId: number
) {
  try {
    await supabaseClient()
      .from("session_question_grade")
      .upsert(
        {
          session_id: sessionId,
          question_id: questionId,
          difficulty_coeff: 1.2,
        },
        {
          onConflict: "session_id",
          ignoreDuplicates: true, // ★存在すれば insert しない
        }
      )
      .select()
      .maybeSingle()
      .throwOnError();

    console.log("supabade への登録完了");
  } catch (error) {
    console.error("supabade の更新エラー:", error);
  }
}

/** グレードデータの子を更新する */
export async function insertGradeSimilaritiesSupabase(
  sessionId: string,
  similarities: Similarities[]
) {
  try {
    await supabaseClient()
      .from("question_similarities")
      .upsert(
        similarities.map((s) => ({
          parent_id: sessionId, // 共通の親IDを付与
          expected_answer_id: s.expectedAnswerId,
          similarity: s.similarity,
        })),
        {
          onConflict: "parent_id,expected_answer_id",
          ignoreDuplicates: true, // ← 既存があれば DO NOTHING（= 挿入しない）
        }
      )
      .throwOnError();

    console.log("supabade への登録完了");
  } catch (error) {
    console.error("supabade の更新エラー:", error);
  }
}

/** supabase 全件取得 */
export async function fetchAllRows(tableName: string) {
  const { data, error } = await supabaseClient().from(tableName).select("*"); // 全カラム取得

  if (error) {
    console.error("取得エラー:", error);
    return [];
  }

  return data;
}

/** 古いデータの削除 */
export async function deleteOldCluelist() {
  const { error } = await supabaseClient().rpc("delete_old_cluelist");

  if (error) {
    console.error("削除エラー:", error);
  } else {
    console.log("古いbotデータを削除しました");
  }
}
