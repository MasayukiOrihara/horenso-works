import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  CommaSeparatedListOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers";

const ANTHROPIC_MODEL_3 = "claude-3-haiku-20240307";
const ANTHROPIC_MODEL_3_5 = "claude-3-5-haiku-20241022";

export const strParser = new StringOutputParser();
export const listParser = new CommaSeparatedListOutputParser();

// opebAIモデル（4o）
export const OpenAi = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4o",
  temperature: 0.5,
  cache: true,
  tags: ["Horenso-works"],
});

// openAI 埋め込みモデル（large）
export const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "text-embedding-3-large",
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
