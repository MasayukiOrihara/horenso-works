import * as TYPE from "@/lib/type";
import { WRONGMATCH_ERROR, SCORE_GET_ERROR } from "@/lib/message/error";
import { searchEmbeddingSupabase } from "../lib/supabase";
import * as CON from "@/lib/contents/match";
import { MatchThreshold } from "@/lib/contents/match";

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
  const tempEvaluationRecords: TYPE.Evaluation[] = evaluationRecords;

  const maxThreshold = threshold.maxWrongThreshold ?? CON.WRONG_MATCH_SCORE;

  // 外れリストを参照し、もし一致したら不正解としてこれ以降の処理を飛ばす
  try {
    // リスト検索に必要な情報（共通なので1つ目のレコードから取得）
    const question_id = tempEvaluationRecords[0].document.metadata.question_id;
    const embedding = tempEvaluationRecords[0].input.embedding;

    // ベクトルストア内のドキュメントとユーザーの答えを比較
    let WrongScore: TYPE.FuzzyScore | null = null;
    try {
      //throw new Error("デバッグ用エラー");
      // supabase から ハズレ回答 を取得
      const results = await searchEmbeddingSupabase(
        CON.WRONGLIST_TABLE,
        CON.WRONGLIST_QUERY,
        embedding,
        1,
        question_id
      );

      // 変換
      const max = results[0];
      WrongScore = {
        id: max?.[0].metadata.id,
        score: max?.[1],
        nearAnswer: max?.[0].pageContent,
        reason: max?.[0].metadata.reason,
        correct: "unknown",
      };
    } catch (error) {
      console.error(SCORE_GET_ERROR, error);
    }

    // エラー処理（null の場合も含む）
    if (!WrongScore) throw new Error(SCORE_GET_ERROR);
    console.log(
      "WRONG:: score: " + WrongScore.score + ", match: " + WrongScore.nearAnswer
    );

    // まとめてチェック
    tempEvaluationRecords.map(async (record) => {
      // 答えの結果が出てない
      const isAnswerUnknown = record.answerCorrect === "unknown";
      // ハズレリストの閾値以上
      const exceedsWrongMatchThreshold = WrongScore.score > maxThreshold;
      if (isAnswerUnknown && exceedsWrongMatchThreshold) {
        WrongScore.correct = "incorrect"; // 不正解
        record.answerCorrect = WrongScore.correct;
      }
      record.WrongScore = WrongScore; // 記録
    });
    console.log(" → " + tempEvaluationRecords[0].answerCorrect);
  } catch (error) {
    console.warn(WRONGMATCH_ERROR + error);
  }

  return { tempEvaluationRecords };
}
