import { Evaluation } from "@/lib/type";

type FinalizeNode = {
  evaluationRecords: Evaluation[];
};

/**
 * 最後にデータを整形して出力するノード
 * @param param0
 * @returns
 */
export async function finalizeResultNode({ evaluationRecords }: FinalizeNode) {
  // 中身型チェック
  const allHaveFuzzyScore = evaluationRecords.every(
    (r) => typeof r.fuzzyScore?.score === "number"
  );
  const allHaveBadScore = evaluationRecords.every(
    (r) => typeof r.badScore?.score === "number"
  );

  // ソート
  if (allHaveFuzzyScore) {
    evaluationRecords.sort((a, b) => b.fuzzyScore!.score - a.fuzzyScore!.score);
  } else if (allHaveBadScore) {
    evaluationRecords.sort((a, b) => b.badScore!.score - a.badScore!.score);
  } else {
    evaluationRecords.sort(
      (a, b) => b.documentScore.score - a.documentScore.score
    );
  }

  // 一番目の要素を取得
  const topRecord = evaluationRecords[0];

  return { topRecord: topRecord };
}
