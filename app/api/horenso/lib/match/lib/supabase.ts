import { Document } from "langchain/document";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

import { supabaseClient } from "@/lib/clients";
import { embeddings } from "@/lib/llm/models";
import * as ERR from "@/lib/message/error";

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

/**
 * Supabaseテーブルが「存在して」「空でない」かどうか判定する
 */
export async function isTableMissingOrEmpty(
  tableName: string
): Promise<boolean> {
  try {
    // 1. テーブルが存在するかを情報スキーマから確認
    const { data: tables, error: schemaError } = await supabaseClient().rpc(
      "table_exists",
      {
        tname: tableName,
      }
    );

    if (schemaError || !tables || tables.length === 0) {
      // テーブルが存在しない
      console.warn(
        "⚠️ supabase にテーブルが存在しません。: " + schemaError?.message
      );
      return true;
    }

    // 2. 中身が空かチェック（limit 1 で十分）
    const { data: rows, error: dataError } = await supabaseClient()
      .from(tableName)
      .select("id") // 何か1列だけでOK
      .limit(1);

    if (dataError || !rows || rows.length === 0) {
      // 空のテーブル
      console.warn("⚠️ supabase のテーブルが空です。: " + dataError?.message);
      return true;
    }

    // テーブルが存在して、かつデータが入っている
    return false;
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("✖ 接続エラー（Supabaseと通信できない） :" + message);
    return true;
  }
}

/**
 * 類似度検索クエリ
 * @param query
 * @param k
 * @returns
 */
export async function searchDocuments(
  query: string,
  k = 4,
  tableName: string,
  queryName: string
) {
  try {
    // VectorStoreをSupabaseのテーブル 'documents' で初期化
    const vectorStore = new SupabaseVectorStore(embeddings, {
      client: supabaseClient(),
      tableName: tableName,
      queryName: queryName, // 事前にSQLで作成している関数名
    });

    // 類似度検索
    const results = await vectorStore.similaritySearch(query, k);
    const data = results.map((val) => val.pageContent);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("✖ 接続エラー（Supabaseと通信できない） :" + message);
    return null;
  }
}
