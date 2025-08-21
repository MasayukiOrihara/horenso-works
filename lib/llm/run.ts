import { Runnable } from "@langchain/core/runnables";
import { OpenAi4_1Mini, OpenAi4oMini } from "./models";
import { UNKNOWN_ERROR } from "../message/messages";
import { PromptTemplate } from "@langchain/core/prompts";

// 型
interface StreamChunk {
  content?: string;
  additional_kwargs?: Record<string, unknown>;
}

// フォールバック可能なLLM一覧
const fallbackLLMs: Runnable[] = [OpenAi4_1Mini, OpenAi4oMini];

/* レート制限に達したときに別のモデルに切り替える対策 + 指数バックオフ付き */
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
        // プロンプトの全文取得（ログ出力）
        await getAllPrompt(runnable, input);

        // LLM 呼び出し
        const pipeline = runnable.pipe(model);
        if (parser) pipeline.pipe(parser);
        const callback = createLatencyCallback(model.lc_kwargs.model);
        const result =
          mode === "stream"
            ? await pipeline.stream(input, {
                callbacks: [callback],
              })
            : await pipeline.invoke(input, {
                callbacks: [callback],
              });

        // ✅ 成功モデルのログ
        console.log(`[LLM] Using model: ${model.lc_kwargs.model}`);

        // stream 応答時終了後に処理を行う
        return mode === "stream" ? enhancedStream(result) : result;
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

/* プロンプト全文取得 */
const getAllPrompt = async (
  runnable: Runnable,
  input: Record<string, unknown>
) => {
  const fullPrompt = await (runnable as PromptTemplate).format(input);

  // ログ出力
  //   console.log("=== 送信するプロンプト全文 ===");
  //   console.log(fullPrompt);
  //   console.log("================================");
};

/* ストリーム終了後の処理 */
const enhancedStream = (stream: AsyncIterable<StreamChunk>) =>
  new ReadableStream({
    async start(controller) {
      let response = "";

      for await (const chunk of stream) {
        response += chunk.content || "";
        // ストリームにはそのまま流す
        controller.enqueue(chunk);
      }
      console.log("ストリーミング正常完了\n");

      // レスポンスを保存
      controller.close();
    },
  });

/* 呼び出し時間測定用のコールバック関数（ラベル付き） */
const createLatencyCallback = (label: string) => {
  let startTime = 0;
  let firstTokenTime: number | null = null;

  return {
    // LLM 呼び出し直後
    handleLLMStart() {
      startTime = Date.now();
    },
    // 最初のトークン
    handleLLMNewToken() {
      if (firstTokenTime === null) {
        firstTokenTime = Date.now() - startTime;
        const seconds = Math.floor(firstTokenTime / 1000);
        const milliseconds = firstTokenTime % 1000;

        // ログに出力
        console.log(
          `[${label}] first token latency: ${seconds}s ${milliseconds}ms`
        );
      }
    },
    // 出力完了
    handleLLMEnd() {
      // 計測秒数を計算
      const elapsedMs = Date.now() - startTime;
      const seconds = Math.floor(elapsedMs / 1000);
      const milliseconds = elapsedMs % 1000;

      // ログに出力
      console.log(`[${label}] all latency: ${seconds}s ${milliseconds}ms`);
    },
  };
};
