import { PromptTemplate } from "@langchain/core/prompts";

import { OpenAi4oMini, strParser } from "@/lib/models";
import {
  FOR_REPORT_COMMUNICATION,
  INSTRUCTOR_INTRO_MESSAGE_PROMPT,
  USER_QUESTION_LABEL_PROMPT,
} from "../../contents/messages";
import { getMemoryApi } from "@/lib/api/serverApi";

/** 会話からユーザーの意図を推測する */
export const judgeTalk = async (input: string, question: string) => {
  const template =
    INSTRUCTOR_INTRO_MESSAGE_PROMPT +
    USER_QUESTION_LABEL_PROMPT +
    question +
    `以下の入力対して、ユーザーの入力意図を推測し出力してください。
    入力意図の出力は以下の分類から選択してください。
    
    入力意図の分類: 回答 | 質問 | 冗談 | その他
    ※ その他を選択した場合は理由と新たに分けるとしたら分類を出力してください。
    
    Current conversation: ---
    {chat_history}
    ---
    
    ユーザーの入力: {input}
    assistant: `;

  const chatHistory = await getMemoryApi();
  const prompt = PromptTemplate.fromTemplate(template);
  const response = await prompt.pipe(OpenAi4oMini).pipe(strParser).invoke({
    input: input,
    chat_history: chatHistory,
  });

  return response;
};
