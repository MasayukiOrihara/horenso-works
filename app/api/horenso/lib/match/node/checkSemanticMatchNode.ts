import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";
import { FUZZYMATCH_ERROR, SCORE_GET_ERROR } from "@/lib/message/error";
import { searchEmbeddingSupabase } from "../lib/supabase";

type BadCheckNode = {
  evaluationRecords: TYPE.Evaluation[];
};

// 定数
const SEMANTIC_MATCH_SCORE = 0.82; // 曖昧基準値
const FUZZYLIST_TABLE = "fuzzylist";
const FUZZYLIST_QUERY = "search_fuzzylist";

/**
 * あいまいチェックを行うノード
 * @param param0
 * @returns
 */
export async function checkSemanticMatchNode({
  evaluationRecords,
}: BadCheckNode) {
  const tempEvaluationRecords: TYPE.Evaluation[] = evaluationRecords;

  // 曖昧リストから検索し最大値スコアを取得
  try {
    // リスト検索に必要な情報（共通なので1つ目のレコードから取得）
    const question_id = tempEvaluationRecords[0].document.metadata.question_id;
    const embedding = tempEvaluationRecords[0].input.embedding;

    // ベクトルストア内のドキュメントとユーザーの答えを比較
    let fuzzyScore: TYPE.FuzzyScore | null = null;
    try {
      //throw new Error("デバッグ用エラー");

      // supabase から あいまい正答 を取得
      const results = await searchEmbeddingSupabase(
        FUZZYLIST_TABLE,
        FUZZYLIST_QUERY,
        embedding,
        1,
        question_id
      );

      // 変換
      const max = results[0];
      fuzzyScore = {
        id: max?.[0].metadata.id,
        score: max?.[1],
        nearAnswer: max?.[0].pageContent,
        reason: max?.[0].metadata.reason,
        correct: "unknown",
      };
    } catch (error) {
      console.error(SCORE_GET_ERROR, error);
    }

    // エラー処理
    if (!fuzzyScore) throw new Error(SCORE_GET_ERROR);
    console.log(
      "FUZZY:: score: " + fuzzyScore.score + ", match: " + fuzzyScore.nearAnswer
    );

    // まとめてチェック
    tempEvaluationRecords.map(async (record) => {
      // 答えの結果が出てない
      const isAnswerUnknown = record.answerCorrect === "unknown";
      // あいまいリストの閾値以上
      const exceedsBadMatchThreshold = fuzzyScore.score > SEMANTIC_MATCH_SCORE;
      if (isAnswerUnknown && exceedsBadMatchThreshold) {
        fuzzyScore.correct = "correct"; // 正解
        record.answerCorrect = fuzzyScore.correct;
      }
      record.fuzzyScore = fuzzyScore;
    });
    // ログは一つだけ
    console.log(" → " + tempEvaluationRecords[0].answerCorrect);
  } catch (error) {
    console.warn(FUZZYMATCH_ERROR + error);
  }

  return { tempEvaluationRecords };
}
