import { PromptTemplate } from "@langchain/core/prompts";

import { listParser } from "@/lib/llm/models";
import { LLMResult, runWithFallback } from "@/lib/llm/run";

/** LLMを利用して答えを切り分ける(haiku3.5使用) */
export const splitInputLlm = async (promptText: string, input: string) => {
  // プロンプト
  const prompt = PromptTemplate.fromTemplate(promptText);
  // プロンプトに入る変数
  const promptVariables = {
    input: input,
    format_instructions: listParser.getFormatInstructions(),
  };
  // LLM応答（配列のパサーを使っているがうまくいってない？）
  const splitUserAnswer = (await runWithFallback(prompt, promptVariables, {
    mode: "invoke",
    parser: listParser,
    label: "split input",
  })) as LLMResult;

  // 型変換
  const str: string = splitUserAnswer.content ?? "";
  const arr: string[] = str.split(",").map((s) => s.trim());

  return arr;
};
