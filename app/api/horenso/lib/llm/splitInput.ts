import { PromptTemplate } from "@langchain/core/prompts";

import { haiku3_5_sentence, listParser } from "@/lib/models";

/** LLMを利用して答えを切り分ける(haiku3.5使用) */
export const splitInputLlm = async (promptText: string, input: string) => {
  const template = promptText;
  const prompt = PromptTemplate.fromTemplate(template);
  const spritUserAnswer = await prompt
    .pipe(haiku3_5_sentence)
    .pipe(listParser)
    .invoke({
      input: input,
      format_instructions: listParser.getFormatInstructions(),
    });

  return spritUserAnswer;
};
