import { PromptTemplate } from "@langchain/core/prompts";
import { Document } from "langchain/document";

import { strParser } from "@/lib/llm/models";
import { Evaluation, HorensoMetadata } from "@/lib/type";
import { LLMParserResult, runWithFallback } from "@/lib/llm/run";
import { GUIDED_ANSWER_PROMPT } from "@/lib/contents/horenso/template";

/** LLMを利用して答えを導くヒントを生成する */
export const generateHintLlm = async (
  question: string,
  data: Evaluation[],
  documents: Document<HorensoMetadata>[]
) => {
  // もし top が空なら未正解の部分からヒントを選出する
  const incorrectAnswer = documents.filter(
    (item) => item.metadata.isMatched === false
  );

  // 正答
  const correctAnswer =
    data.length > 0
      ? data.map((val) => val.document.pageContent).join(", ")
      : incorrectAnswer.map((item) => item.pageContent).join(", ");
  // ユーザーの答え
  const userAnswer =
    data.length > 0 ? data.map((val) => val.input.userAnswer).join(", ") : "";

  // ヒントの出力
  let hint = "";
  try {
    const template = GUIDED_ANSWER_PROMPT;
    const prompt = PromptTemplate.fromTemplate(template);
    const promptVariables = {
      question: question,
      currect_answer: correctAnswer,
      user_answer: userAnswer,
    };

    // LLM応答（配列のパサーを使っているがうまくいってない？）
    const response = (await runWithFallback(prompt, promptVariables, {
      mode: "invoke",
      parser: strParser,
      label: "generate hint",
    })) as LLMParserResult;

    // 型変換
    hint = response as string;
  } catch (error) {
    console.warn(`ヒントを取得できませんでした: ${error}`);
  }

  return hint;
};
