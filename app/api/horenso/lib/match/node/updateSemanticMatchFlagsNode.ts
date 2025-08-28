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
export async function updateSemanticMatchFlagsNode({
  evaluationRecords,
  matchAnswerArgs,
}: UpdateNode) {
  const documents = matchAnswerArgs.documents;

  // あいまい検索の結果正解だった場合の更新
  evaluationRecords.map(async (record) => {
    const bestDocument = record.document as Document<TYPE.HorensoMetadata>;
    const parentId = bestDocument.metadata.parentId;

    // ドキュメントの正解判定を更新
    documents.forEach((d) => {
      const docParentId = d.metadata.parentId;
      if (docParentId === parentId) {
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
