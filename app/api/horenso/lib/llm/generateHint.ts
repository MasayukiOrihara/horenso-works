import { PromptTemplate } from "@langchain/core/prompts";

import { sonnet, strParser } from "@/lib/models";
import { HorensoDocument, UserAnswerEvaluation } from "@/lib/type";
import { GUIDED_ANSWER_PROMPT } from "../../contents/messages";

/** LLMを利用して答えを導くヒントを生成する */
export const generateHintLlm = async (
  question: string,
  top: UserAnswerEvaluation[],
  documents: HorensoDocument[]
) => {
  // もし top が空なら未正解の部分からヒントを選出する
  const incorrectAnswer = documents.filter(
    (item) => item.metadata.isMatched === false
  );
  const correctAnswer =
    top.length > 0
      ? top.map((val) => val.currentAnswer).join(", ")
      : incorrectAnswer.map((item) => item.pageContent).join(", ");
  const userAnswer =
    top.length > 0 ? top.map((val) => val.userAnswer).join(", ") : "";

  console.log(correctAnswer);

  const template = GUIDED_ANSWER_PROMPT;
  const prompt = PromptTemplate.fromTemplate(template);
  const getHint = await prompt.pipe(sonnet).pipe(strParser).invoke({
    question: question,
    currect_answer: correctAnswer,
    user_answer: userAnswer,
  });
  return getHint;
};
