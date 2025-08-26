import { Document } from "langchain/document";
import { HorensoMetadata, HorensoStates } from "@/lib/type";
import { Evaluation } from "../lib/match/route";
import { whyDocuments } from "../contents/documents";

type UserAnswerNode = {
  evaluationData: Evaluation[];
  whyUseDocuments: Document<HorensoMetadata>[];
  transition: HorensoStates;
};

/**
 *
 * @param param0 ユーザーの回答を判定するノード
 * @returns
 */
export function checkUserAnswerNode({
  evaluationData,
  whyUseDocuments,
  transition,
}: UserAnswerNode) {
  const flag: HorensoStates = { ...transition };
  switch (transition.step) {
    case 0:
      console.log("質問1: 報連相は誰のため？");

      // 1つでも正解でok
      const isCorrectWho = evaluationData.some(
        (doc) => doc.document.metadata.isMatched
      );
      console.log(isCorrectWho);
      if (isCorrectWho) {
        flag.step = 1;
        flag.isAnswerCorrect = true;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");

      // 全問正解判定を行う
      // parentId と isMatched だけ抽出
      const results = whyUseDocuments.map(
        ({ metadata: { parentId, isMatched } }) => ({
          parentId,
          isMatched,
        })
      );
      // evaluationData からさらに判定
      for (const data of evaluationData) {
        results.forEach((result) => {
          if (data.document.metadata.parentId === result.parentId) {
            result.isMatched = data.document.metadata.isMatched; // ← 更新
          }
        });
      }
      console.log(results);
      // 全正解判定
      const isAllCorrect = results.every((result) => result.isMatched);
      if (isAllCorrect) {
        flag.hasQuestion = false;
        flag.isAnswerCorrect = true;
      }
      break;
  }
  console.log("🐶 正解判定");
  console.log(flag);

  return { flag };
}
