import { Document } from "langchain/document";

import { HorensoMetadata } from "@/lib/type";
import * as MSG from "@/lib/contents/horenso/template";

type QuestionNode = {
  step: number;
  whyUseDocuments: Document<HorensoMetadata>[];
};

export function askQuestionNode({ step, whyUseDocuments }: QuestionNode) {
  const contexts = [];

  contexts.push(MSG.FINAL_QUESTION_PROMPT);

  // プロンプトに追加
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
        contexts.push(`答えは残り ${count} つです。`);
      } else {
        contexts.push(MSG.THREE_ANSWER);
      }
      break;
  }

  return { contexts };
}
