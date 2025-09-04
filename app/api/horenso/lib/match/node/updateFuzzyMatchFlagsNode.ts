import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";

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
  evaluationRecords.map(async (record) => {
    const bestDocument = record.document as Document<TYPE.HorensoMetadata>;
    const expectedAnswerId = bestDocument.metadata.expectedAnswerId;

    // ドキュメントの正解判定を更新
    documents.forEach((d) => {
      const docExpectedAnswerId = d.metadata.expectedAnswerId;
      if (docExpectedAnswerId === expectedAnswerId) {
        d.metadata.isMatched = true; // matchAnswerArgs の document
        record.document.metadata.isMatched = true; // evaluationRecords の document
      }
    });
  });

  return {
    tempMatchAnswerArgs: matchAnswerArgs,
    tempEvaluationRecords: evaluationRecords,
  };
}
