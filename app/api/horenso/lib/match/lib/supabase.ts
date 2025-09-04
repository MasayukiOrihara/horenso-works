import { Document } from "langchain/document";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

import { supabaseClient } from "@/lib/supabase/clients";

import { Similarities } from "@/lib/type";

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
