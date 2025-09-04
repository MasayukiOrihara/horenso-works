import * as TYPE from "@/lib/type";
import { WRONGMATCH_ERROR, SCORE_GET_ERROR } from "@/lib/message/error";
import * as CON from "@/lib/contents/match";
import { MatchThreshold } from "@/lib/contents/match";
import { EmbeddingService } from "@/lib/supabase/services/embedding.service";
import { embeddings } from "@/lib/llm/embedding";
import { DbError } from "@/lib/supabase/error";

type WrongCheckNode = {
  evaluationRecords: TYPE.Evaluation[];
  threshold: MatchThreshold;
};

/**
 * ハズレチェックを行うノード
 * @param param0
 * @returns
 */
export async function checkWrongMatchNode({
  evaluationRecords,
  threshold,
}: WrongCheckNode) {
  // 1) 入力ガード
  if (evaluationRecords.length === 0) {
    return { tempEvaluationRecords: [] as TYPE.Evaluation[] };
  }

  // 2) 共通値の抽出（なければ即エラー）
  const first = evaluationRecords[0];
  const question_id = first?.document?.metadata?.question_id;
  const vector = first?.input?.vector;
  if (!question_id || !vector) {
    throw new Error(SCORE_GET_ERROR + ": missing question_id or vector");
  }
  const maxThreshold = threshold.maxWrongThreshold ?? CON.WRONG_MATCH_SCORE;
  // ベクトルストア内のドキュメントとユーザーの答えを比較

  try {
    // 3) ベクター検索（Service 側で throw 済み前提）
    const results = await EmbeddingService.searchByVector(
      embeddings,
      CON.WRONGLIST_TABLE,
      CON.WRONGLIST_QUERY,
      vector,
      1,
      { question_id }
    );

    // 4) 結果の整形（0件は仕様次第：throw か、何もしないで返すか）
    if (!results?.length) {
      throw new DbError("No wrong result");
    }
    const [doc, score] = results[0];
    const baseWrong: TYPE.FuzzyScore = {
      id: doc.metadata.id,
      score,
      nearAnswer: doc.pageContent,
      reason: doc.metadata.reason,
      correct: "unknown",
    };
    // 5) 閾値超えかどうかを一度だけ計算
    const exceeds = score > maxThreshold;
    const tempEvaluationRecords = evaluationRecords.map((record) => {
      const answerUnknown = record.answerCorrect === "unknown";
      const wrongScore =
        answerUnknown && exceeds
          ? ({ ...baseWrong, correct: "incorrect" } as const)
          : baseWrong;
      return {
        ...record,
        answerCorrect:
          answerUnknown && exceeds
            ? ("incorrect" as const)
            : record.answerCorrect,
        wrongScore,
      };
    });

    // ログは最小限で有用なものだけ
    console.log(
      `WRONG:: score:${baseWrong.score}, match:${baseWrong.nearAnswer}`
    );
    console.log(" → ", tempEvaluationRecords[0].answerCorrect);

    return { tempEvaluationRecords };
  } catch (error) {
    const err = error as DbError;
    console.warn(WRONGMATCH_ERROR, err);
    throw err; // 上に投げる
  }
}
