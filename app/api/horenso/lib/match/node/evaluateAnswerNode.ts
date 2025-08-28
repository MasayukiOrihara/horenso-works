import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";
import { judgeSemanticMatch, updateSemanticMatch } from "../lib/semantic";

type EvaluateNode = {
  evaluationRecords: TYPE.Evaluation[];
  documents: Document<TYPE.HorensoMetadata>[];
};

const AI_EVALUATE_ERROR = "AI のよる判定結果が得られませんでした";

/**
 * AI による回答評価
 * @param param0
 * @returns
 */
export async function evaluateAnswerNode({
  evaluationRecords,
  documents,
}: EvaluateNode) {
  // AI による判定
  let evaluate: TYPE.SemanticAnswerEntry | null = null;
  try {
    const userAnswer = evaluationRecords[0].input.userAnswer;
    evaluate = await judgeSemanticMatch(userAnswer, documents);
  } catch (error) {
    console.warn(AI_EVALUATE_ERROR + error);
    return { tempEvaluationRecords: evaluationRecords };
  }

  // 判定結果を取得
  if (evaluate) {
    evaluationRecords.map(async (record) => {
      const bestDocument = record.document as Document<TYPE.HorensoMetadata>;

      // 比較対象回答と一致しているかの確認
      const evaluateParentId = String(evaluate.metadata.parentId);
      const checkIdMatch = evaluateParentId === bestDocument.metadata.parentId;
      // 判定OK
      if (evaluate && checkIdMatch) {
        // DB の更新

        // オブジェクトの更新
        const fuzzyScore: TYPE.FuzzyScore = {
          id: evaluate.id,
          score: 1,
          reason: evaluate.reason,
          correct: "correct",
        };
        record.fuzzyScore = fuzzyScore;
        record.answerCorrect = "correct";
      }
    });
  }

  return { tempEvaluationRecords: evaluationRecords };
}
