import { Document } from "langchain/document";

import * as MSG from "../contents/messages";

type QuestionNode = {
  step: number;
  whyUseDocuments: Document<Record<string, any>>[];
};

export function askQuestionNode({ step, whyUseDocuments }: QuestionNode) {
  const contexts = [];

  // プロンプトに追加
  contexts.push(MSG.BULLET + MSG.STUDENT_FEEDBACK_QUESTION_PROMPT + "\n");

  switch (step) {
    case 0:
      contexts.push(MSG.FOR_REPORT_COMMUNICATION);
      break;
    case 1:
      contexts.push(MSG.REPORT_REASON_FOR_LEADER);
      // 残り問題数の出力
      const count = Object.values(whyUseDocuments).filter(
        (val) => val.metadata.isMatched === false
      ).length;
      if (count < 3) {
        contexts.push(`答えは残り ${count} つです。\n\n`);
      } else {
        contexts.push(MSG.THREE_ANSWER);
      }
      break;
  }

  return { contexts };
}
