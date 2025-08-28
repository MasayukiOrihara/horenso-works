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
  const allHaveWrongScore = evaluationRecords.every(
    (r) => typeof r.WrongScore?.score === "number"
  );

  // ソート
  if (allHaveFuzzyScore) {
    evaluationRecords.sort((a, b) => b.fuzzyScore!.score - a.fuzzyScore!.score);
  } else if (allHaveWrongScore) {
    evaluationRecords.sort((a, b) => b.WrongScore!.score - a.WrongScore!.score);
  } else {
    evaluationRecords.sort(
      (a, b) => b.documentScore.score - a.documentScore.score
    );
  }

  // 一番目の要素を取得
  const topRecord = evaluationRecords[0];

  return { topRecord: topRecord };
}
