import { Document } from "langchain/document";

import * as MSG from "../contents/messages";
import * as DOC from "../contents/documents";
import { findMatchStatusChanges } from "../lib/match/match";
import { HorensoMetadata, UserAnswerEvaluation } from "@/lib/type";

let oldWhoUseDocuments = DOC.whoDocuments.map((doc) => ({
  pageContent: doc.pageContent,
  metadata: { ...doc.metadata },
}));
let oldWhyUseDocuments = DOC.whyDocuments.map((doc) => ({
  pageContent: doc.pageContent,
  metadata: { ...doc.metadata },
}));

type HintNode = {
  whoUseDocuments: Document<HorensoMetadata>[];
  whyUseDocuments: Document<HorensoMetadata>[];
  userAnswerDatas: UserAnswerEvaluation[];
  step: number;
  aiHint: string;
};

/**
 * ヒントを付与するノード
 * @param param0
 * @returns
 */
export function generateHintNode({
  whoUseDocuments,
  whyUseDocuments,
  userAnswerDatas,
  step,
  aiHint,
}: HintNode) {
  const contexts = [];
  contexts.push("# 返答作成の手順\n\n");

  // どっちのドキュメントを参照するか
  let documents: Document<HorensoMetadata>[] = [];
  let oldDocuments: Document<HorensoMetadata>[] = [];
  switch (step) {
    case 0:
      documents = whoUseDocuments; // 今回は使わないけど一応
      oldDocuments = oldWhoUseDocuments;
      break;
    case 1:
      documents = whyUseDocuments;
      oldDocuments = oldWhyUseDocuments;
      break;
  }

  // 部分的に正解だった場合、今回正解した差分を見つけ出す
  const changed = findMatchStatusChanges(oldDocuments, documents);
  console.log("差分:");
  console.log(changed);

  // ローカルドキュメントにコピー
  const copiedDocuments = documents.map((doc) => ({
    pageContent: doc.pageContent,
    metadata: { ...doc.metadata },
  }));
  switch (step) {
    case 0:
      oldWhoUseDocuments = copiedDocuments;
      break;
    case 1:
      oldWhyUseDocuments = copiedDocuments;
      break;
  }

  const haveChanged = Object.keys(changed).length > 0;
  const hasAnyMatch = userAnswerDatas.some(
    (doc) => doc.isAnswerCorrect === true
  );
  if (haveChanged) {
    // 部分的に正解だったところを解説
    contexts.push(MSG.BULLET + MSG.PARTIAL_CORRECT_FEEDBACK_PROMPT);
    for (const doc of changed) {
      for (const user of userAnswerDatas) {
        if (doc.metadata.parentId === user.parentId && user.isAnswerCorrect) {
          contexts.push(
            `ユーザー回答: ${user.userAnswer}, 答え: ${doc.pageContent} \n`
          );
        }
      }
    }
    contexts.push("\n");
  } else if (!haveChanged && hasAnyMatch) {
    // 部分的に正解だが、すでに正解だった場合
    contexts.push(
      MSG.BULLET +
        "以下のユーザー回答は部分的に正解ですが、すでにその項目は正解済みだったことを伝えてください。"
    );
    for (const doc of documents) {
      for (const user of userAnswerDatas) {
        if (
          doc.metadata.isMatched &&
          doc.metadata.parentId === user.parentId &&
          user.isAnswerCorrect
        ) {
          contexts.push(
            `ユーザー回答: ${user.userAnswer}, 答え: ${doc.pageContent} \n`
          );
        }
      }
    }
  } else {
    // 不正解
    contexts.push(MSG.BULLET + MSG.CLEAR_FEEDBACK_PROMPT);
  }
  contexts.push(MSG.BULLET + MSG.COMMENT_ON_ANSWER_PROMPT);

  // 現在の正解を報告
  const count = Object.values(documents).filter(
    (val) => val.metadata.isMatched === true
  ).length;
  if (count > 0) {
    contexts.push(MSG.BULLET + MSG.CORRECT_PARTS_LABEL_PROMPT);
    contexts.push(
      `正解数 ${count} / ${
        Object.values(documents).length
      } \n正解した項目: ${documents.map((page) =>
        page.metadata.isMatched === true ? page.pageContent + ", " : ""
      )}`
    );
    contexts.push("\n\n");
  }

  // ヒントをプロンプトに含める
  const formattedHint = aiHint.replace(/(\r\n|\n|\r|\*)/g, "");
  contexts.push(`ユーザーへの助言: --- \n ${formattedHint}\n ---\n`);

  return { contexts };
}
