import { Document } from "langchain/document";

import { Evaluation, HorensoMetadata, SessionFlags } from "@/lib/type";
import { findMatchStatusChanges } from "../lib/match/lib/utils";

import * as MSG from "@/lib/contents/horenso/template";
import * as DOC from "@/lib/contents/horenso/documents";
import { QuestionStatsRepo } from "@/lib/supabase/repositories/questionStats.repo";

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
  sessionFlags: SessionFlags;
  aiHint: string;
  category: string;
};

const userAnswerTemplate = (userAnswer: string, correct: string) =>
  `ユーザー回答: ${userAnswer}\n質問の正解: ${correct}`;

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
export async function generateHintNode({
  whoUseDocuments,
  whyUseDocuments,
  evaluationData,
  sessionFlags,
  aiHint,
  category,
}: HintNode) {
  const contexts = [];
  contexts.push(MSG.ANSWER_STEP);

  // どっちのドキュメントを参照するか
  let documents: Document<HorensoMetadata>[] = [];
  let oldDocuments: Document<HorensoMetadata>[] = [];
  switch (sessionFlags.step) {
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

  // ローカルドキュメントにコピー
  const copiedDocuments = documents.map((doc) => ({
    pageContent: doc.pageContent,
    metadata: { ...doc.metadata },
  }));
  switch (sessionFlags.step) {
    case 0:
      oldWhoUseDocuments = copiedDocuments;
      break;
    case 1:
      oldWhyUseDocuments = copiedDocuments;
      break;
  }

  // 会話の種類次第で反応を変える
  let correctPoint: string = "";
  switch (category) {
    case "質問":
      // ヒント回数を記録
      const r = await QuestionStatsRepo.incHint(
        sessionFlags.sessionId,
        documents[0].metadata.questionId
      );
      if (!r.ok) throw r.error;
      console.log("✅ inc_retry_count テーブル を 更新しました。");
      contexts.push(MSG.ANSWER_INSTRUCTION_PROMPT);
      break;
    case "冗談":
      contexts.push(MSG.JOKE_RESPONSE_INSTRUCTION);
      break;
    case "回答":
    default:
      const haveChanged = Object.keys(changed).length > 0;
      const hasAnyMatch = evaluationData.some(
        (data) => data.answerCorrect === "correct"
      );
      if (haveChanged) {
        // 部分的に正解だったところを解説
        contexts.push(MSG.PARTIAL_CORRECT_FEEDBACK_PROMPT);
        for (const data of evaluationData) {
          if (data.answerCorrect === "correct") {
            correctPoint = userAnswerTemplate(
              data.input.userAnswer,
              data.document.pageContent
            );
          }
        }
      } else if (!haveChanged && hasAnyMatch) {
        // 部分的に正解だが、すでに正解だった場合
        contexts.push(MSG.ALREADY_ANSWERED_NOTICE);
        for (const data of evaluationData) {
          if (
            data.document.metadata.isMatched &&
            data.answerCorrect === "correct"
          ) {
            correctPoint = userAnswerTemplate(
              data.input.userAnswer,
              data.document.pageContent
            );
          }
        }
      } else {
        // 不正解
        contexts.push(MSG.CLEAR_FEEDBACK_PROMPT);
      }
      break;
  }

  contexts.push(MSG.COMMENT_ON_ANSWER_PROMPT);

  // 現在の正解を報告
  let alreadyCorrectText: string = "";
  const count = Object.values(documents).filter(
    (val) => val.metadata.isMatched === true
  ).length;
  if (count > 0) {
    contexts.push(MSG.CORRECT_PARTS_LABEL_PROMPT);

    const matchedPages = documents.filter((page) => page.metadata.isMatched);
    const matchedContents = matchedPages.map((page) => page.pageContent);
    alreadyCorrectText = matchedSummaryMessage(
      matchedPages.length,
      documents.length,
      matchedContents
    );
  }

  // ヒントをプロンプトに含める
  contexts.push(MSG.USER_ADVICE_PROMPT);
  contexts.push(MSG.STUDENT_FEEDBACK_QUESTION_PROMPT + "\n");

  // 今回の正解箇所
  contexts.push(MSG.CORRECT_POINT);
  contexts.push(correctPoint);
  contexts.push("\n\n");

  // すでに正解の箇所
  contexts.push(MSG.ALREADY_CORRECT_PROMPT);
  contexts.push(alreadyCorrectText);
  contexts.push("\n\n");

  // ヒントルールの出力
  contexts.push(MSG.HINT_ROLES_PROMPT);
  // 禁止ワードの作成
  const leakWord =
    documents
      .filter((page) => !page.metadata.isMatched)
      .map((page) => page.metadata.answerLeakWords)
      .join(",") ?? "";
  contexts.push(`${leakWord}\n\n`);

  // ヒントの出力
  const formattedHint = aiHint.replace(/(\r\n|\n|\r|\*)/g, "");
  contexts.push(MSG.HINT_REFERENCE_PROMPT.replace("{hint}", formattedHint));

  return { contexts };
}
