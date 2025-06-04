import { Client } from "langsmith";

// langSmithクライアント
export const LangSmithClient = new Client({
  apiKey: process.env.LANGSMITH_API_KEY,
});
