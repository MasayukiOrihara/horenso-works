import { SessionFlags } from "@/lib/type";
import * as MSG from "@/lib/contents/horenso/template";

type QuestionNode = {
  sessionFlags: SessionFlags;
};

export function askQuestionNode({ sessionFlags }: QuestionNode) {
  const step = sessionFlags.step;
  const currectStatus = sessionFlags.currectStatus;
  const contexts = [];

  const q2MaxLength = 3;

  // 最終質問
  contexts.push(MSG.FINAL_QUESTION_PROMPT);

  // プロンプトに追加
  switch (step) {
    case 0:
      contexts.push(MSG.FOR_REPORT_COMMUNICATION);
      break;
    case 1:
      contexts.push(MSG.REPORT_REASON_FOR_LEADER);
      // 残り問題数の出力
      const count = q2MaxLength - currectStatus.length;
      if (count < q2MaxLength) {
        contexts.push(`答えは残り ${count} つです。`);
      } else {
        contexts.push(MSG.THREE_ANSWER);
      }
      break;
  }

  return { contexts };
}
