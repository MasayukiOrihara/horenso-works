import { BaseMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { Document } from "langchain/document";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

import {
  embeddings,
  haiku3_5_sentence,
  listParser,
  strParser,
} from "@/lib/models";
import { UserAnswerEvaluation } from "@/lib/type";

/** メッセージ形式をStringに変換する関数 */
export function messageToText(message: BaseMessage[], index: number) {
  const result =
    typeof message[index].content === "string"
      ? message[index].content
      : message[index].content
          .map((c: { type?: string; text?: string }) => c.text ?? "")
          .join("");

  return result;
}

/** vector store が既にあるかのチェック */
export async function cachedVectorStore(documents: Document[]) {
  let cachedVectorStore: MemoryVectorStore | null = null;
  let cachedDocHash = "";

  function hashDocuments(docs: Document[]): string {
    return JSON.stringify(docs); // 簡易版。正確にやるなら md5 等でハッシュ化
  }

  const currentDocHash = hashDocuments(documents);

  if (!cachedVectorStore || cachedDocHash !== currentDocHash) {
    cachedVectorStore = await MemoryVectorStore.fromDocuments(
      documents,
      embeddings
    );
    cachedDocHash = currentDocHash;
  }

  return cachedVectorStore;
}

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

/** データをスコア順に並べ替える */
export const sortScore = (data: UserAnswerEvaluation[]) => {
  return data
    .slice()
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 3);
};

/** LLMを利用して答えを導くヒントを生成する */
export const generateHintLlm = async (
  promptText: string,
  question: string,
  top: UserAnswerEvaluation[]
) => {
  const template = promptText;
  const prompt = PromptTemplate.fromTemplate(template);
  const getHint = await prompt
    .pipe(haiku3_5_sentence)
    .pipe(strParser)
    .invoke({
      question: question,
      currect_answer: top.map((val) => val.currentAnswer).join(", "),
      user_answer: top.map((val) => val.userAnswer).join(", "),
    });
  return getHint;
};
