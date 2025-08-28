import * as TYPE from "@/lib/type";
import { BADMATCH_ERROR, SCORE_GET_ERROR } from "@/lib/message/error";
import { searchEmbeddingSupabase } from "../lib/supabase";
import * as CON from "@/lib/contents/match";

type BadCheckNode = {
  evaluationRecords: TYPE.Evaluation[];
};

/**
 * ハズレチェックを行うノード
 * @param param0
 * @returns
 */
export async function checkBadMatchNode({ evaluationRecords }: BadCheckNode) {
  const tempEvaluationRecords: TYPE.Evaluation[] = evaluationRecords;

  // 外れリストを参照し、もし一致したら不正解としてこれ以降の処理を飛ばす
  try {
    // リスト検索に必要な情報（共通なので1つ目のレコードから取得）
    const question_id = tempEvaluationRecords[0].document.metadata.question_id;
    const embedding = tempEvaluationRecords[0].input.embedding;

    // ベクトルストア内のドキュメントとユーザーの答えを比較
    let badScore: TYPE.FuzzyScore | null = null;
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
      badScore = {
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
    if (!badScore) throw new Error(SCORE_GET_ERROR);
    console.log(
      "BAD:: score: " + badScore.score + ", match: " + badScore.nearAnswer
    );

    // まとめてチェック
    tempEvaluationRecords.map(async (record) => {
      // 答えの結果が出てない
      const isAnswerUnknown = record.answerCorrect === "unknown";
      // ハズレリストの閾値以上
      const exceedsBadMatchThreshold = badScore.score > CON.BAD_MATCH_SCORE;
      if (isAnswerUnknown && exceedsBadMatchThreshold) {
        badScore.correct = "incorrect"; // 不正解
        record.answerCorrect = badScore.correct;
      }
      record.badScore = badScore; // 記録
    });
    console.log(" → " + tempEvaluationRecords[0].answerCorrect);
  } catch (error) {
    console.warn(BADMATCH_ERROR + error);
  }

  return { tempEvaluationRecords };
}
