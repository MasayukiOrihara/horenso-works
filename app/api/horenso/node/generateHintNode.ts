import { Document } from "langchain/document";

import * as MSG from "../contents/messages";
import { findMatchStatusChanges } from "../lib/match";
import { UserAnswerEvaluation } from "@/lib/type";

type HintNode = {
  isPartialMatch: Document<Record<string, any>>[];
  whyUseDocuments: Document<Record<string, any>>[];
  userAnswerData: UserAnswerEvaluation[];
  step: number;
  aiHint: string;
};

/**
 * ヒントを付与するノード
 * @param param0
 * @returns
 */
export function generateHintNode({
  isPartialMatch,
  whyUseDocuments,
  userAnswerData,
  step,
  aiHint,
}: HintNode) {
  // 今回正解した差分を見つけ出す（※※ プロンプトの順番の関係上switchに含めずこうしてる、もし最終的にプロンプトの編集をするなら不要かも）
  const changed = findMatchStatusChanges(isPartialMatch, whyUseDocuments);
  console.log("差分: " + changed.map((page) => page.pageContent));

  // プロンプトに含める
  const contexts = [];
  if (Object.keys(changed).length > 0) {
    contexts.push(MSG.BULLET + MSG.PARTIAL_CORRECT_FEEDBACK_PROMPT);
    for (const page of changed) {
      for (const data of userAnswerData) {
        if (page.pageContent === data.currentAnswer && data.isAnswerCorrect) {
          console.log("部分正解: " + data.userAnswer);
          contexts.push(data.userAnswer + "\n");
        }
      }
    }
    contexts.push("\n");
  } else {
    contexts.push(MSG.BULLET + MSG.CLEAR_FEEDBACK_PROMPT);
  }
  contexts.push(MSG.BULLET + MSG.COMMENT_ON_ANSWER_PROMPT);

  switch (step) {
    case 0:
      console.log("ヒント1: 報連相は誰のため？");

      // プロンプトに含める
      contexts.push(
        `ユーザーへの助言: ---------- \n ${aiHint}\n -----------\n`
      );
      break;
    case 1:
      console.log("ヒント2: なぜリーダーのため？");

      // 現在の正解を報告
      const count = Object.values(whyUseDocuments).filter(
        (val) => val.metadata.isMatched === true
      ).length;
      contexts.push(MSG.BULLET + MSG.CORRECT_PARTS_LABEL_PROMPT);
      contexts.push(
        `正解数 ${count} \n正解した項目: ${whyUseDocuments.map((page) =>
          page.metadata.isMatched === true ? page.pageContent + ", " : ""
        )}`
      );
      contexts.push("\n\n");

      // プロンプトに含める
      contexts.push(
        `ユーザーへの助言: ---------- \n ${aiHint}\n -----------\n`
      );

      isPartialMatch = whyUseDocuments.map((doc) => ({
        pageContent: doc.pageContent,
        metadata: { ...doc.metadata },
      }));
      break;
  }

  return { contexts };
}
