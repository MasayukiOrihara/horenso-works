import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";

import * as MSG from "@/lib/contents/horenso/template";
import * as DOC from "@/lib/contents/horenso/documents";
import { QuestionStatsRepo } from "@/lib/supabase/repositories/questionStats.repo";

type HintNode = {
  evaluationData: TYPE.Evaluation[];
  sessionFlags: TYPE.SessionFlags;
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
  evaluationData,
  sessionFlags,
  aiHint,
  category,
}: HintNode) {
  const contexts = [];
  contexts.push(MSG.ANSWER_STEP);

  let currectStatus = sessionFlags.currectStatus;

  // どっちのドキュメントを参照するか
  let documents: Document<TYPE.HorensoMetadata>[] = [];
  switch (sessionFlags.step) {
    case 0:
      documents = DOC.whoDocuments; // 今回は使わないけど一応
      break;
    case 1:
      documents = DOC.whyDocuments;
      break;
  }

  // 部分的に正解だった場合、今回正解した差分を見つけ出す
  const diffs = currectStatus.filter((item) => item.new);
  console.log("差分: ");
  console.log(diffs);
  // 新規フラフを下す
  currectStatus = currectStatus.map((s) => ({
    ...s,
    new: false,
  }));

  // 会話の種類次第で反応を変える
  let correctPoint: string = "";
  switch (category) {
    case "質問":
      // ヒント回数を記録
      const r = await QuestionStatsRepo.incHint(
        sessionFlags.sessionId,
        String(sessionFlags.step + 1)
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
      const haveChanged = Object.keys(diffs).length > 0;
      const hasAnyMatch = evaluationData.some(
        (data) => data.answerCorrect === "correct"
      );
      if (haveChanged) {
        // 部分的に正解だったところを解説
        contexts.push(MSG.PARTIAL_CORRECT_FEEDBACK_PROMPT);
        for (const diff of diffs) {
          for (const data of evaluationData) {
            const isCorrect = data.answerCorrect === "correct"; // 正解判定
            const hasExpectedAnswerId =
              data.document.metadata.expectedAnswerId === diff.expectedAnswerId;
            if (isCorrect && hasExpectedAnswerId) {
              correctPoint = userAnswerTemplate(
                data.input.userAnswer,
                data.document.pageContent
              );
            }
          }
        }
      } else if (!haveChanged && hasAnyMatch) {
        // 部分的に正解だが、すでに正解だった場合
        contexts.push(MSG.ALREADY_ANSWERED_NOTICE);
        for (const data of evaluationData) {
          const isCorrect = data.answerCorrect === "correct"; // 正解判定
          if (data.document.metadata.isMatched && isCorrect) {
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
  const count = currectStatus.length;
  if (count > 0) {
    contexts.push(MSG.CORRECT_PARTS_LABEL_PROMPT);

    const filtered = documents.filter((doc) =>
      currectStatus.some(
        (status) => status.expectedAnswerId === doc.metadata.expectedAnswerId
      )
    );

    const matchedContents = filtered.map((page) => page.pageContent);
    alreadyCorrectText = matchedSummaryMessage(
      filtered.length,
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

  const tempSessionFlags = { ...sessionFlags, currectStatus: currectStatus };

  return { contexts, tempSessionFlags };
}
