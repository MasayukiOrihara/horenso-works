import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";

/** データに重みづけしたスコアを計算して出力 */
export const getRankedResults = (
  results: [Document<TYPE.ClueMetadata>, number][]
) => {
  const rankedResults: TYPE.AdjustedClue[] = [];
  for (const [bestMatch, score] of results) {
    console.log("score: " + score + ", match: " + bestMatch.pageContent);
    if (score < 0.7) break;

    // 重みづけと選出
    const rawQuality = bestMatch?.metadata?.quality;
    const quality = toNumberOrUndefined(rawQuality);

    const qual = quality ?? 0.5;
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
    const rankScore = score * 0.6 + qual * 0.3 + weight * 0.1;
    console.log(rankScore);

    // データ作成
    const adjustedClue: TYPE.AdjustedClue = {
      id: bestMatch.metadata.id,
      rankScore: rankScore,
      clue: bestMatch.metadata.clue,
      quality: bestMatch.metadata.quality,
    };
    console.log(
      `ID: ${adjustedClue.id}  総合スコア: ${adjustedClue.rankScore}`
    );
    rankedResults.push(adjustedClue);
  }
  return rankedResults;
};

/** 余分なデータフィルターし、スコア順に並べ替える */
export const sortScore = (data: TYPE.Evaluation[]) => {
  // 不正解のみを残してソート
  return data
    .filter((r) => r.answerCorrect !== "correct")
    .sort((a, b) => {
      const scoreA = a.documentScore?.score ?? -Infinity;
      const scoreB = b.documentScore?.score ?? -Infinity;
      return scoreB - scoreA; // 降順
    });
};

//  文字列 "null" / "undefined" / "" などを除去して数値へ
const toNumberOrUndefined = (v: unknown): number | undefined => {
  if (v === null || v === undefined) return undefined;
  if (v === "" || v === "null" || v === "undefined") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};
