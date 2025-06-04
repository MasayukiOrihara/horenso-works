import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

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
