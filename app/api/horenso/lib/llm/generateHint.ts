import { sonnet, strParser } from "@/lib/models";
import { UserAnswerEvaluation } from "@/lib/type";
import { PromptTemplate } from "@langchain/core/prompts";

/** LLMを利用して答えを導くヒントを生成する */
export const generateHintLlm = async (
  promptText: string,
  question: string,
  top: UserAnswerEvaluation[]
) => {
  const template = promptText;
  const prompt = PromptTemplate.fromTemplate(template);
  const getHint = await prompt
    .pipe(sonnet)
    .pipe(strParser)
    .invoke({
      question: question,
      currect_answer: top.map((val) => val.currentAnswer).join(", "),
      user_answer: top.map((val) => val.userAnswer).join(", "),
    });
  return getHint;
};
