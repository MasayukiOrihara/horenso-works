import { HorensoStates, SessionFlags } from "@/lib/type";

type UserAnswerNode = {
  transition: HorensoStates;
  sessionFlags: SessionFlags;
};

/**
 *
 * @param param0 ユーザーの回答を判定するノード
 * @returns
 */
export async function checkUserAnswerNode({
  transition,
  sessionFlags,
}: UserAnswerNode) {
  const flag: HorensoStates = { ...transition };

  console.log("問題の正解状況");
  console.log(sessionFlags.currectStatus);

  switch (sessionFlags.step) {
    case 0:
      console.log("質問1: 報連相は誰のため？");

      // 1つでも正解でok
      const isCorrectWho = sessionFlags.currectStatus.length >= 1;
      if (isCorrectWho) {
        flag.isAnswerCorrect = true;
        // 正解判定をリセット
        sessionFlags.currectStatus.length = 0;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");

      // 全正解判定
      const isAllCorrect = sessionFlags.currectStatus.length >= 3;
      if (isAllCorrect) {
        flag.isAnswerCorrect = true;
        // 正解判定をリセット
        sessionFlags.currectStatus.length = 0;
      }
      break;
  }

  console.log("正解判定：");
  console.log(flag);

  return { flag, updateSessionFlags: sessionFlags };
}
