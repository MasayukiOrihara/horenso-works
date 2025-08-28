import { PromptTemplate } from "@langchain/core/prompts";

import { strParser } from "@/lib/llm/models";
import { runWithFallback } from "@/lib/llm/run";

import * as MSG from "@/lib/contents/horenso/template";

/** 会話からユーザーの意図を推測する */
export const analyzeInput = async (input: string, question: string) => {
  const template =
    MSG.INSTRUCTOR_INTRO_MESSAGE_PROMPT +
    MSG.USER_QUESTION_LABEL_PROMPT +
    question +
    MSG.USER_INTENT_PROMPT;

  // ※※ 後で過去履歴を参照させて文脈で判断させる
  const prompt = PromptTemplate.fromTemplate(template);
  const promptVariables = {
    input: input,
  };

  // LLM応答（配列のパサーを使っているがうまくいってない？）
  const response = await runWithFallback(prompt, promptVariables, {
    mode: "invoke",
    parser: strParser,
    label: "analyze input",
  });

  // 型変換
  const str: string = response.content;

  return str;
};
