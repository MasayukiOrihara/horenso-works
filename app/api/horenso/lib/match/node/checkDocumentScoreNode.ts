import { DocumentInterface } from "@langchain/core/documents";
import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";
import * as CON from "@/lib/contents/match";
import { MatchThreshold } from "@/lib/contents/match";

type DocCheckNode = {
  similarityResults: [DocumentInterface<Record<string, unknown>>, number][];
  matchAnswerArgs: TYPE.MatchAnswerArgs;
  userEmbedding: TYPE.UserAnswerEmbedding;
  threshold: MatchThreshold;
};

/**
 * document から正答をチェックする関数
 * @param param0
 */
export async function checkDocumentScoreNode({
  similarityResults,
  matchAnswerArgs,
  userEmbedding,
  threshold,
}: DocCheckNode) {
  const documents = matchAnswerArgs.documents;
  const evaluationRecords: TYPE.Evaluation[] = []; // 評価結果オブジェクト

  const maxThreshold = threshold.maxBaseThreshold ?? CON.BASE_MATCH_SCORE;
  const minThreshold = threshold.minBaseThreshold ?? CON.BASE_WORST_SCORE;

  // スコアが閾値以上の場合3つのそれぞれのフラグを上げる(閾値スコアは固定で良い気がする)
  similarityResults.forEach(([bestMatch, score]) => {
    const bestDocument = bestMatch as Document<TYPE.HorensoMetadata>;
    console.log(
      "DOC:: score: " + score + ", match: " + bestDocument.pageContent
    );

    for (const doc of documents) {
      if (bestDocument.pageContent === doc.pageContent) {
        const bestParentId = bestDocument.metadata.parentId;

        // ✅ 結果の作成
        const documentScore: TYPE.DocumentScore = {
          id: bestParentId,
          score: score,
          correct: "unknown",
        };

        // 不正解判定
        if (score < minThreshold) {
          documentScore.correct = "incorrect";
        }

        // 正解判定
        if (score >= maxThreshold) {
          // 正解ののフラグ上げる
          doc.metadata.isMatched = true; // matchAnswerArgs 内の document
          bestMatch.metadata.isMatched = true; // similarityResults 内の document

          // 評価を正解に変更
          documentScore.correct = "correct";
        }
        // ✅ 評価を作成
        const evaluation: TYPE.Evaluation = {
          input: userEmbedding,
          document: bestDocument,
          documentScore: documentScore,
          answerCorrect: documentScore.correct,
        };
        evaluationRecords.push(evaluation);
        console.log(" → " + documentScore.correct);
      }
    }
  });

  // 値を更新
  const tempMatchAnswerArgs = {
    ...matchAnswerArgs,
    documents: documents,
  };

  return { tempMatchAnswerArgs, evaluationRecords };
}
