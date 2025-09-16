import { PromptTemplate } from "@langchain/core/prompts";

import { listParser } from "@/lib/llm/models";
import { LLMParserResult, runWithFallback } from "@/lib/llm/run";
import { SPLIT_INPUT_ERROR } from "@/lib/message/error";

/** LLMを利用して答えを切り分ける(haiku3.5使用) */
export const splitInputLlm = async (promptText: string, input: string) => {
  // プロンプト
  const prompt = PromptTemplate.fromTemplate(promptText);
  // プロンプトに入る変数
  const promptVariables = {
    input: input,
    format_instructions: listParser.getFormatInstructions(),
  };

  let output: string[] = [];
  try {
    // LLM応答
    const splitUserAnswer = (await runWithFallback(prompt, promptVariables, {
      mode: "invoke",
      parser: listParser,
      label: "split input",
    })) as LLMParserResult;

    // 型変換
    const arr: string[] = splitUserAnswer as string[];
    output = arr;
  } catch (error) {
    console.warn(SPLIT_INPUT_ERROR + error);
  }

  return output;
};
