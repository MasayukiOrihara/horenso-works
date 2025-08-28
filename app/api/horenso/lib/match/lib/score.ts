import { Document } from "langchain/document";

import { Evaluation, QADocumentMetadata, UsedEntry } from "@/lib/type";

/** データに重みづけしたスコアを計算して出力 */
export const getRankedResults = (
  results: [Document<QADocumentMetadata>, number][]
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
export const sortScore = (data: Evaluation[]) => {
  // 不正解のみを残してソート
  return data
    .filter((r) => r.answerCorrect !== "correct")
    .sort((a, b) => {
      const scoreA = a.documentScore?.score ?? -Infinity;
      const scoreB = b.documentScore?.score ?? -Infinity;
      return scoreB - scoreA; // 降順
    });
};
