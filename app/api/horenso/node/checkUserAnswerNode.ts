import { Document } from "langchain/document";
import { HorensoMetadata, HorensoStates } from "@/lib/type";

type UserAnswerNode = {
  whoUseDocuments: Document<HorensoMetadata>[];
  whyUseDocuments: Document<HorensoMetadata>[];
  transition: HorensoStates;
};

/**
 *
 * @param param0 ユーザーの回答を判定するノード
 * @returns
 */
export function checkUserAnswerNode({
  whoUseDocuments,
  whyUseDocuments,
  transition,
}: UserAnswerNode) {
  const flag: HorensoStates = { ...transition };
  switch (transition.step) {
    case 0:
      console.log("質問1: 報連相は誰のため？");

      // 正解パターン
      const isCorrectWho = whoUseDocuments.some(
        (doc) => doc.metadata.isMatched
      );
      if (isCorrectWho) {
        flag.step = 1;
        flag.isAnswerCorrect = true;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");

      // 全正解
      const isCorrectWhy = whyUseDocuments.every(
        (doc) => doc.metadata.isMatched
      );
      if (isCorrectWhy) {
        flag.hasQuestion = false;
        flag.isAnswerCorrect = true;
      }
      break;
  }

  return { flag };
}
