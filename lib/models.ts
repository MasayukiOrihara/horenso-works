import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import {
  CommaSeparatedListOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

const ANTHROPIC_MODEL_3 = "claude-3-haiku-20240307";
const ANTHROPIC_MODEL_3_5 = "claude-3-5-haiku-20241022";

export const strParser = new StringOutputParser();
export const listParser = new CommaSeparatedListOutputParser();

// opebAIモデル（4o）
export const OpenAi = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
  temperature: 0.8,
  cache: true,
  tags: ["Horenso-works"],
});
// opebAIモデル（4o-mini）
export const openAi4oMini = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o-mini",
  temperature: 0.4,
  tags: ["Horenso-works"],
});

// openAI 埋め込みモデル（large）
export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-large",
});

// anthropic(sonnet)(langchain経由)
export const sonnet = new ChatAnthropic({
  model: "claude-sonnet-4-20250514",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 216,
  temperature: 0,
});

// anthropic(haiku-3.5)(langchain経由)
export const haiku3_5 = new ChatAnthropic({
  model: ANTHROPIC_MODEL_3_5,
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 1,
  temperature: 0,
});

// anthropic(haiku-3.5)(langchain経由)
export const haiku3_5_sentence = new ChatAnthropic({
  model: ANTHROPIC_MODEL_3_5,
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 512,
  temperature: 0,
});

// anthropic(haiku-3)(langchain経由)
export const haiku3 = new ChatAnthropic({
  model: ANTHROPIC_MODEL_3,
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxTokens: 64,
  temperature: 0,
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
