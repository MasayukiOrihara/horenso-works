import { LlmLogRepo } from "../repositories/llmLog.repo";

export type Usage = { prompt?: number; completion?: number; total?: number };
export type LatencyMetrics = {
  label: string;
  startedAt: number;
  finishedAt?: number;
  firstTokenMs?: number;
  totalMs?: number;
};

export async function saveLlmLog({
  sessionId,
  label,
  llmName,
  fullPrompt,
  fullOutput,
  usage,
  metrics,
  extra,
}: {
  sessionId: string;
  label: string;
  llmName: string;
  fullPrompt: string;
  fullOutput: string;
  usage?: Usage | null;
  metrics?: LatencyMetrics | null;
  extra?: Record<string, unknown>;
}) {
  // usage が取れない場合は “文字数” でざっくり代用（必要なら外せます）
  const promptChars = fullPrompt.length;
  const outputChars = fullOutput.length;

  const tokens_prompt = usage?.prompt ?? null; // 厳密なトークンが取れていればそれを保存
  const tokens_output = usage?.completion ?? null;

  return LlmLogRepo.insert({
    session_id: sessionId,
    label,
    llm_name: llmName,
    prompt: fullPrompt,
    output: fullOutput,
    tokens_prompt,
    tokens_output,
    latency_ms: metrics?.totalMs ?? null,
    extra: {
      ...(extra ?? {}),
      usage_totalTokens: usage?.total ?? null,
      // 参考情報も入れておくと後で便利
      promptChars,
      outputChars,
      firstTokenMs: metrics?.firstTokenMs ?? null,
      startedAt: metrics?.startedAt ?? null,
      finishedAt: metrics?.finishedAt ?? null,
      app: "horenso-works",
    },
  });
}
