import { OpenAIEmbeddings } from "@langchain/openai";

// APIキーチェック
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("❌ OPENAI_API_KEY is not set");
}

// 1回だけ new して export
export const embeddings = new OpenAIEmbeddings({
  apiKey,
  modelName: "text-embedding-3-large",
});
