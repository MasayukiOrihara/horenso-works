import { Document } from "langchain/document";

import * as MSG from "../contents/messages";
import * as DOC from "../contents/documents";
import { HorensoMetadata } from "@/lib/type";
import { findMatchStatusChanges } from "../lib/utils";
import { Evaluation } from "../lib/match/route";

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
  evaluationData: Evaluation[];
  step: number;
  aiHint: string;
  talkJudge: string;
};

const ANSWER_STEP = "# 返答作成の手順\n\n";
const ANSWER_INSTRUCTION_PROMPT =
  "まず初めにユーザーの質問に回答してください。ただし現在講師として投げかけた質問の答えに関しては回答せず、ヒントを参考に回答してください。\n";
const JOKE_RESPONSE_INSTRUCTION =
  "まず初めにその冗談にのってあげてください。\n";
const ALREADY_ANSWERED_NOTICE =
  "以下のユーザー回答は部分的に正解ですが、すでにその項目は正解済みだったことを伝えてください。\n";

const userAnswerTemplate = (userAnswer: string, correct: string) =>
  `ユーザー回答: ${userAnswer}\n質問の正解: ${correct}\n --- \n`;
const hintSubmitTemplate = (hint: string) =>
  `ユーザーへの助言: --- \n ${hint}\n ---\n`;

const matchedSummaryMessage = (
  count: number,
  total: number,
  matchedItems: string[]
): string => {
  return `正解数 ${count} / ${total}\n正解した項目: ${matchedItems.join(", ")}`;
};

/**
 * ヒントを付与するノード
 * @param param0
 * @returns
 */
export function generateHintNode({
  whoUseDocuments,
  whyUseDocuments,
  evaluationData,
  step,
  aiHint,
  talkJudge,
}: HintNode) {
  const contexts = [];
  contexts.push(ANSWER_STEP);

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

  // 会話糸の分離
  const match = talkJudge.match(/入力意図の分類:\s*(質問|回答|冗談|その他)/);
  const category = match ? match[1] : "";
  console.log("入力意図の分類: " + category);

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

  // 会話の種類次第で反応を変える
  switch (category) {
    case "質問":
      contexts.push(MSG.BULLET + ANSWER_INSTRUCTION_PROMPT);
      break;
    case "冗談":
      contexts.push(MSG.BULLET + JOKE_RESPONSE_INSTRUCTION);
      break;
    case "回答":
    default:
      const haveChanged = Object.keys(changed).length > 0;
      const hasAnyMatch = evaluationData.some(
        (data) => data.answerCorrect === "correct"
      );
      if (haveChanged) {
        // 部分的に正解だったところを解説
        contexts.push(MSG.BULLET + MSG.PARTIAL_CORRECT_FEEDBACK_PROMPT);
        for (const data of evaluationData) {
          if (data.answerCorrect === "correct") {
            contexts.push(
              userAnswerTemplate(
                data.input.userAnswer,
                data.document.pageContent
              )
            );
          }
        }
        contexts.push("\n");
      } else if (!haveChanged && hasAnyMatch) {
        // 部分的に正解だが、すでに正解だった場合

        contexts.push(MSG.BULLET + ALREADY_ANSWERED_NOTICE);

        for (const data of evaluationData) {
          if (
            data.document.metadata.isMatched &&
            data.answerCorrect === "correct"
          ) {
            contexts.push(
              userAnswerTemplate(
                data.input.userAnswer,
                data.document.pageContent
              )
            );
          }
        }
      } else {
        // 不正解
        contexts.push(MSG.BULLET + MSG.CLEAR_FEEDBACK_PROMPT);
      }
      break;
  }

  contexts.push(MSG.BULLET + MSG.COMMENT_ON_ANSWER_PROMPT);

  // 現在の正解を報告
  const count = Object.values(documents).filter(
    (val) => val.metadata.isMatched === true
  ).length;
  if (count > 0) {
    contexts.push(MSG.BULLET + MSG.CORRECT_PARTS_LABEL_PROMPT);

    const matchedPages = documents.filter((page) => page.metadata.isMatched);
    const matchedContents = matchedPages.map((page) => page.pageContent);
    contexts.push(
      matchedSummaryMessage(
        matchedPages.length,
        documents.length,
        matchedContents
      )
    );
    contexts.push("\n\n");
  }

  // 禁止ワードの作成
  const leakWord =
    documents
      .filter((page) => !page.metadata.isMatched)
      .map((page) => page.metadata.answerLeakWords)
      .join(",") ?? "";

  // ヒントをプロンプトに含める
  contexts.push(MSG.BULLET + MSG.USER_ADVICE_PROMPT);
  contexts.push(`${leakWord}\n\n`);
  const formattedHint = aiHint.replace(/(\r\n|\n|\r|\*)/g, "");
  contexts.push(hintSubmitTemplate(formattedHint));

  return { contexts };
}
