import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";
import { AnswerStatusRepo } from "@/lib/supabase/repositories/answerStatus.repo";

type UpdateNode = {
  evaluationRecords: TYPE.Evaluation[];
  matchAnswerArgs: TYPE.MatchAnswerArgs;
};

/**
 * document 内のフラグを更新する
 * @param param0
 * @returns
 */
export async function updateFuzzyMatchFlagsNode({
  evaluationRecords,
  matchAnswerArgs,
}: UpdateNode) {
  const documents = matchAnswerArgs.documents;

  // あいまい検索の結果正解だった場合の更新
  for (const record of evaluationRecords) {
    const bestDocument = record.document as Document<TYPE.HorensoMetadata>;
    const expectedAnswerId = bestDocument.metadata.expectedAnswerId;

    // ドキュメントの正解判定を更新
    for (const doc of documents) {
      const docExpectedAnswerId = doc.metadata.expectedAnswerId;
      if (docExpectedAnswerId !== expectedAnswerId) continue;

      if (record.answerCorrect === "correct") {
        // DB 更新
        const r = await AnswerStatusRepo.upsert(
          matchAnswerArgs.sessionId,
          doc.metadata.questionId,
          doc.metadata.expectedAnswerId,
          true,
          record.documentScore.score
        );
        if (!r.ok) throw r.error;
        console.log("✅ session_answer_status テーブルを更新しました");
      }

      doc.metadata.isMatched = true; // matchAnswerArgs の document
      record.document.metadata.isMatched = true; // evaluationRecords の document
    }
  }

  return {
    tempMatchAnswerArgs: matchAnswerArgs,
    tempEvaluationRecords: evaluationRecords,
  };
}
