import { HorensoStates } from "@/lib/type";

type UserAnswerNode = {
  matched: boolean[];
  transition: HorensoStates;
};

/**
 *
 * @param param0 ユーザーの回答を判定するノード
 * @returns
 */
export function checkUserAnswerNode({ matched, transition }: UserAnswerNode) {
  const tempIsCorrect = matched.some((result) => result === true);
  console.log("質問の正解判定: " + tempIsCorrect);

  const flag: HorensoStates = { ...transition };
  switch (transition.step) {
    case 0:
      console.log("質問1: 報連相は誰のため？");

      // 正解パターン
      if (tempIsCorrect) {
        flag.step = 1;
        flag.isAnswerCorrect = true;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");

      // 全正解
      if (tempIsCorrect) {
        flag.hasQuestion = false;
        flag.isAnswerCorrect = true;
      }
      break;
  }

  return { flag };
}
