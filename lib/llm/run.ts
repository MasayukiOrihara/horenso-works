import { Runnable } from "@langchain/core/runnables";
import { Document } from "langchain/document";
import { OpenAi4_1Mini, OpenAi4oMini } from "./models";
import { UNKNOWN_ERROR } from "../message/error";
import { PromptTemplate } from "@langchain/core/prompts";
import { saveLlmLog } from "../supabase/services/saveLlmLog.service";
import { extractOutputText } from "../utils";
import * as TYPE from "../type";

// 型ガード関数
function isLLMEndPayload(x: unknown): x is TYPE.LLMEndPayload {
  return typeof x === "object" && x !== null;
}

// LLM結果の基本型を定義
export type LLMParserResult =
  | string
  | string[]
  | Document<TYPE.PhrasesMetadata>[];
// ストリームのチャンクを扱うインターフェース
export interface StreamChunk {
  content?: string;
  additional_kwargs?: Record<string, unknown>;
}

// Stream結果とInvoke結果のユニオン型
type LLMResponse = LLMParserResult | AsyncIterable<StreamChunk>;

// フォールバック可能なLLM一覧
const fallbackLLMs: Runnable[] = [OpenAi4_1Mini, OpenAi4oMini];

/* レート制限に達したときに別のモデルに切り替える対策 + 指数バックオフ付き */
export async function runWithFallback(
  runnable: Runnable,
  input: Record<string, unknown>,
  options?: TYPE.RunWithFallbackOptions
): Promise<LLMResponse | ReadableStream<StreamChunk>> {
  // デフォルト値を設定
  const {
    mode = "invoke",
    parser,
    maxRetries = 3,
    baseDelay = 200,
    label = "",
    sessionId = "",
    onStreamEnd = async () => {},
  } = options || {};

  for (const model of fallbackLLMs) {
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        // LLM 呼び出し
        let pipeline = runnable.pipe(model);
        if (parser) {
          pipeline = pipeline.pipe(parser);
        }

        const callback = createLatencyCallback(
          label ? label : model.lc_kwargs.model
        );

        const result: LLMResponse =
          mode === "stream"
            ? await pipeline.stream(input, {
                callbacks: [callback],
              })
            : await pipeline.invoke(input, {
                callbacks: [callback],
              });

        // ✅ 成功モデルのログ
        console.log(`[LLM] Using model: ${model.lc_kwargs.model}`);

        // 完成したプロンプトの取得
        const fullPrompt = await getFullPrompt(runnable, input);
        const payload: TYPE.LLMPayload = {
          label: label,
          llmName: model.lc_kwargs.model,
          sessionId: sessionId,
          fullPrompt: fullPrompt,
        };

        console.log("🐶");
        console.log(result);
        console.log(typeof result);
        console.log("🐈");

        // stream 応答時終了後に処理を行う
        return mode === "stream"
          ? enhancedStream(
              result as AsyncIterable<StreamChunk>,
              payload,
              callback,
              onStreamEnd
            )
          : await enhancedInvoke(result as LLMParserResult, payload, callback);
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
const getFullPrompt = async (
  runnable: Runnable,
  input: Record<string, unknown>
): Promise<string> => {
  const fullPrompt = await (runnable as PromptTemplate).format(input);
  return fullPrompt;
};

const enhancedInvoke = async (
  result: LLMParserResult,
  payload: TYPE.LLMPayload,
  callback: ReturnType<typeof createLatencyCallback>
): Promise<LLMParserResult> => {
  const outputText = extractOutputText(result);

  // invoke はここで onLLMEnd が済んでる
  const metrics = callback.getMetrics();
  const usage = callback.getUsage();

  try {
    await saveLlmLog({
      sessionId: payload.sessionId,
      label: payload.label,
      llmName: payload.llmName,
      fullPrompt: payload.fullPrompt,
      fullOutput: outputText,
      usage,
      metrics,
    });
  } catch (e) {
    console.error("[llm_logs.save invoke] insert failed:", e);
  }

  return result;
};

/* ストリーム終了後の処理 */
const enhancedStream = (
  stream: AsyncIterable<StreamChunk>,
  payload: TYPE.LLMPayload,
  callback: ReturnType<typeof createLatencyCallback>,
  onStreamEnd?: (response: string) => Promise<void>
) =>
  new ReadableStream({
    async start(controller) {
      let response = "";

      for await (const chunk of stream) {
        response += chunk.content || "";
        if (typeof chunk.content === "string") {
          controller.enqueue(chunk.content);
        } else if (chunk.additional_kwargs) {
          // 必要ならフォールバック
          controller.enqueue(JSON.stringify(chunk.additional_kwargs));
        }
        // 何もなければ enqueue しない（無音）
      }

      // 終了時に外部処理を走らせる
      if (onStreamEnd) {
        await onStreamEnd(response);

        // 情報を外部保存
        const metrics = callback.getMetrics();
        const usage = callback.getUsage();

        // fullOutput は stream で溜めた response
        try {
          await saveLlmLog({
            sessionId: payload.sessionId,
            label: payload.label,
            llmName: payload.llmName,
            fullPrompt: payload.fullPrompt,
            fullOutput: response,
            usage,
            metrics,
          });
        } catch (e) {
          console.error("[llm_logs.save stream] insert failed:", e);
        }
      }
      controller.close();
    },
  });

/* 呼び出し時間測定用のコールバック関数（ラベル付き） */
const createLatencyCallback = (label: string) => {
  let startTime = 0;
  let firstTokenTime: number | null = null;
  let finishedAt: number | null = null;
  let usage: TYPE.Usage | null = null;

  const metrics: TYPE.LatencyMetrics = {
    label,
    startedAt: Date.now(),
  };

  return {
    // LLM 呼び出し直後
    handleLLMStart(): void {
      startTime = Date.now();
      metrics.startedAt = startTime;
    },

    // 最初のトークン
    handleLLMNewToken(): void {
      if (firstTokenTime === null) {
        firstTokenTime = Date.now() - startTime;
        metrics.firstTokenMs = firstTokenTime;

        const seconds = Math.floor(firstTokenTime / 1000);
        const milliseconds = firstTokenTime % 1000;

        // ログに出力
        console.log(
          `[${label}] first token latency: ${seconds}s ${milliseconds}ms`
        );
      }
    },

    // 出力完了
    handleLLMEnd(payload?: unknown): void {
      // 計測秒数を計算
      finishedAt = Date.now();
      const elapsedMs = finishedAt - startTime;
      metrics.finishedAt = finishedAt;
      metrics.totalMs = elapsedMs;

      const seconds = Math.floor(elapsedMs / 1000);
      const milliseconds = elapsedMs % 1000;

      // ログに出力
      console.log(`[${label}] all latency: ${seconds}s ${milliseconds}ms`);

      // usageを多段フォールバックで取得
      if (isLLMEndPayload(payload)) {
        const u =
          payload.llmOutput?.tokenUsage ||
          payload.usage ||
          payload.response?.usage ||
          null;

        if (u) {
          usage = {
            prompt: u.promptTokens ?? u.prompt_tokens ?? u.input_tokens ?? 0,
            completion:
              u.completionTokens ?? u.completion_tokens ?? u.output_tokens ?? 0,
            total: u.totalTokens ?? u.total_tokens ?? undefined,
          };
        }
      }
    },

    // --- 追加: 外から計測結果を取得できるように ---
    getMetrics(): TYPE.LatencyMetrics {
      return { ...metrics };
    },

    getUsage(): TYPE.Usage | null {
      return usage;
    },
  };
};
