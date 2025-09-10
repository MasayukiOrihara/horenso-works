import { ChatOpenAI } from "@langchain/openai";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import {
  CommaSeparatedListOutputParser,
  StringOutputParser,
  JsonOutputParser,
} from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

// ぱさー
export const strParser = new StringOutputParser();
export const listParser = new CommaSeparatedListOutputParser();
export const jsonParser = new JsonOutputParser();

// opebAIモデル（4o）
export const OpenAi = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
  temperature: 0.8,
  cache: true,
  tags: ["Horenso-works"],
});
// opebAIモデル（4o-mini）
export const OpenAi4oMini = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  temperature: 0.4,
  tags: ["Horenso-works"],
});
// opebAIモデル（4.1-mini）
export const OpenAi4_1Mini = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1-mini",
  temperature: 0.4, // 要約タスク
  tags: ["Horenso-works"],
});

// フェイクLLMで定型文を吐かせる
export const fake = async (output: string) => {
  const fakeModel = new FakeListChatModel({
    responses: [output],
  });
  const fakePrompt = PromptTemplate.fromTemplate("");
  const fakeStream = await fakePrompt.pipe(fakeModel).stream({});
  return fakeStream;
};
