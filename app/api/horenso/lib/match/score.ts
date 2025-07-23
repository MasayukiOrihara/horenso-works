import { Document } from "langchain/document";

import {
  HorensoMetadata,
  QADocumentMetadata,
  UsedEntry,
  UserAnswerEvaluation,
} from "@/lib/type";

/** データに重みづけしたスコアを計算して出力 */
export const getRankedResults = (
  results: [Document<QADocumentMetadata>, number][],
  step: number
) => {
  const rankedResults: UsedEntry[] = [];
  for (const [bestMatch, score] of results) {
    console.log("score: " + score + ", match: " + bestMatch.pageContent);
    if (score < 0.7) break;

    // 重みづけと選出
    const qual = bestMatch.metadata.quality ?? 0.5;
    let weight = 0.8;
    switch (bestMatch.metadata.source) {
      case "bot":
        weight = 0.6;
        break;
      case "admin":
        weight = 1.4;
        break;
      case "user":
        weight = 1.0;
        break;
    }

    // 総合スコア計算（調整式は適宜チューニング）
    const sum = score * 0.6 + qual * 0.3 + weight * 0.1;
    console.log("総合スコア: " + sum + " ID: " + bestMatch.metadata.id);

    rankedResults.push({
      entry: bestMatch,
      sum: sum,
    });
  }
  return rankedResults;
};

/** 余分なデータフィルターし、スコア順に並べ替える */
export const sortScore = (
  data: UserAnswerEvaluation[],
  documents: Document<HorensoMetadata>[]
) => {
  // userAnswerごとにグループ化
  const grouped = new Map<string, UserAnswerEvaluation[]>();

  for (const item of data) {
    if (!grouped.has(item.userAnswer)) {
      grouped.set(item.userAnswer, []);
    }
    grouped.get(item.userAnswer)!.push(item);
  }

  // すべて不正解の userAnswer を抽出
  const allIncorrectUserAnswers = Array.from(grouped.entries())
    .filter(([, group]) => group.every((item) => !item.isAnswerCorrect))
    .map(([userAnswer]) => userAnswer);

  // 未正解の parentId を抽出
  const incorrectParentId = documents
    .filter((item) => item.metadata.isMatched === false)
    .map((item) => item.metadata.parentId);

  return data
    .slice()
    .sort((a, b) => Number(b.score) - Number(a.score))
    .filter(
      (item) =>
        allIncorrectUserAnswers.includes(item.userAnswer) &&
        incorrectParentId.includes(item.parentId)
    )
    .slice(0, 1);
};
