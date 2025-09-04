import { FUZZYMATCH_ERROR, SCORE_GET_ERROR } from "@/lib/message/error";

import * as TYPE from "@/lib/type";
import * as CON from "@/lib/contents/match";
import { MatchThreshold } from "@/lib/contents/match";
import { EmbeddingService } from "@/lib/supabase/services/embedding.service";
import { embeddings } from "@/lib/llm/embedding";
import { DbError } from "@/lib/supabase/error";

type FuzzyCheckNode = {
  evaluationRecords: TYPE.Evaluation[];
  threshold: MatchThreshold;
};

/**
 * あいまいチェックを行うノード
 * @param param0
 * @returns
 */
export async function checkFuzzyMatchNode({
  evaluationRecords,
  threshold,
}: FuzzyCheckNode) {
  // 1) 入力ガード
  if (evaluationRecords.length === 0) {
    return { tempEvaluationRecords: [] as TYPE.Evaluation[] };
  }

  // 2) 共通値の抽出（存在しないときは即エラー）
  const first = evaluationRecords[0];
  const question_id = first?.document?.metadata?.question_id;
  const vector = first?.input?.embedding;
  if (!question_id || !vector) {
    throw new Error(SCORE_GET_ERROR + ": missing question_id or vector");
  }

  const maxThreshold = threshold.maxFuzzyThreshold ?? CON.FUZZY_MATCH_SCORE;

  // 曖昧リストから検索し最大値スコアを取得
  try {
    // 3) ベクタ検索（Service 側で throw 済み前提）
    const results = await EmbeddingService.searchByVector(
      embeddings,
      CON.FUZZYLIST_TABLE,
      CON.FUZZYLIST_QUERY,
      vector,
      1,
      { question_id }
    );

    // 4) 結果の整形（0件は業務的にあり得るならここで明示 throw か、単に unknown 扱いに）
    if (!results?.length) {
      throw new DbError(SCORE_GET_ERROR);
    }
    const [doc, score] = results[0];
    const baseFuzzy: TYPE.FuzzyScore = {
      id: doc.metadata.id,
      score,
      nearAnswer: doc.pageContent,
      reason: doc.metadata.reason,
      correct: "unknown",
    };

    // 5) 閾値判定（map(async..) は使わない。非同期が無いなら普通の for/for..of で）
    const exceeds = score > maxThreshold;
    const tempEvaluationRecords = evaluationRecords.map((record) => {
      const answerUnknown = record.answerCorrect === "unknown";
      // FuzzyScore は不変にして、必要時のみ correct を上書きしたコピーを持たせる
      const fuzzyScore =
        answerUnknown && exceeds
          ? { ...baseFuzzy, correct: "correct" as const }
          : baseFuzzy;

      return {
        ...record,
        answerCorrect:
          answerUnknown && exceeds
            ? ("correct" as const)
            : record.answerCorrect,
        fuzzyScore,
      };
    });
    // ログは必要最低限
    console.log(
      `FUZZY:: score: ${baseFuzzy.score}, match: ${baseFuzzy.nearAnswer}`
    );
    console.log(" → ", tempEvaluationRecords[0].answerCorrect);

    return { tempEvaluationRecords };
  } catch (error) {
    const err = error as DbError;
    console.warn(FUZZYMATCH_ERROR, err);
    throw err; // 上に投げる
  }
}
