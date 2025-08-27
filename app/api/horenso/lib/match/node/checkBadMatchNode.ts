import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";
import { getMaxScoreSemanticMatch, saveSemanticScoreDB } from "../lib/semantic";
import { BADMATCH_ERROR, SCORE_GET_ERROR } from "@/lib/message/error";

type BadCheckNode = {
  evaluationRecords: TYPE.Evaluation[];
  notCorrectList: TYPE.SemanticAnswerData;
};

// 定数
const BAD_MATCH_SCORE = 0.82; // 外れ基準値

/**
 * ハズレチェックを行うノード
 * @param param0
 * @returns
 */
export async function checkBadMatchNode({
  evaluationRecords,
  notCorrectList,
}: BadCheckNode) {
  const tempEvaluationRecords: TYPE.Evaluation[] = evaluationRecords;

  // 外れリストを参照する逆パターンを作成しもし一致したらこれ以降の処理を飛ばす
  try {
    await Promise.all(
      tempEvaluationRecords.map(async (record) => {
        const bestDocument = record.document as Document<TYPE.HorensoMetadata>;
        const input = record.input;

        const tableName = "wronglist";
        await saveSemanticScoreDB(notCorrectList, tableName);

        // ※※ 読み込みを逐一やってるっぽいんでDBに伴い早くなりそう？userAnserじゃなくて埋め込んだやつを直接使ってもいいかも
        const badScore = await getMaxScoreSemanticMatch(
          input,
          bestDocument,
          notCorrectList
        );
        if (!badScore) throw new Error(SCORE_GET_ERROR);
        record.badScore = badScore;
      })
    );

    // まとめてチェック
    tempEvaluationRecords.map(async (record) => {
      const badScore = record.badScore;
      if (badScore) {
        // 答えの結果が出てない
        const isAnswerUnknown = record.answerCorrect === "unknown";
        // ハズレリストの閾値以上
        const exceedsBadMatchThreshold = badScore.score > BAD_MATCH_SCORE;
        if (isAnswerUnknown && exceedsBadMatchThreshold) {
          badScore.correct = "incorrect"; // 不正解
          record.answerCorrect = badScore.correct;
        }
      }
    });
  } catch (error) {
    console.warn(BADMATCH_ERROR + error);
  }

  return { tempEvaluationRecords };
}
