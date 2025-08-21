import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import {
  CommaSeparatedListOutputParser,
  StringOutputParser,
  JsonOutputParser,
} from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { UNKNOWN_ERROR } from "./messages";
import { Runnable } from "@langchain/core/runnables";

const ANTHROPIC_MODEL_3 = "claude-3-haiku-20240307";
const ANTHROPIC_MODEL_3_5 = "claude-3-5-haiku-20241022";

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
  temperature: 0.7,
  tags: ["Horenso-works"],
});
// opebAIモデル（4.1-mini）
export const OpenAi4_1Mini = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1-mini",
  temperature: 0.2, // 要約タスク
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

// フォールバック可能なLLM一覧
const fallbackLLMs: Runnable[] = [OpenAi4_1Mini, OpenAi4oMini];
// レート制限に達したときに別のモデルに切り替える対策 + 指数バックオフ付き
export async function runWithFallback(
  runnable: Runnable,
  input: Record<string, unknown>,
  mode: "invoke" | "stream" = "invoke",
  parser?: Runnable,
  maxRetries = 3,
  baseDelay = 200
) {
  for (const model of fallbackLLMs) {
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const pipeline = runnable.pipe(model);
        if (parser) pipeline.pipe(parser);
        const result =
          mode === "stream"
            ? await pipeline.stream(input)
            : await pipeline.invoke(input);

        // ✅ 成功モデルのログ
        console.log(`[LLM] Using model: ${model.lc_kwargs.model}`);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : UNKNOWN_ERROR;
        const isRateLimited =
          message.includes("429") ||
          message.includes("rate limit") ||
          message.includes("overloaded");
        if (!isRateLimited) throw err;

        // 指数バックオフの処理
        const delay = Math.min(baseDelay * 2 ** retry, 5000); // 最大5秒
        const jitter = Math.random() * 100;
        console.warn(
          `Model ${model.lc_kwargs.model} failed with rate limit (${
            retry + 1
          }/${maxRetries}): ${message}`
        );
        await new Promise((res) => setTimeout(res, delay + jitter));
      }
    }
    // 次のモデルにフォールバック（次のループへ）
    console.warn(
      `Model ${model.lc_kwargs.model} failed all retries. Trying next model.`
    );
  }
  // どのモデルでも成功しなかった場合
  throw new Error("All fallback models failed.");
}
