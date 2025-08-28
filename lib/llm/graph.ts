// 全体の処理時間を計測するユーティリティ（型安全版）
export async function measureExecution<
  TGraph extends { invoke: (...args: TArgs) => Promise<TResult> },
  TArgs extends unknown[] = Parameters<TGraph["invoke"]>,
  TResult = Awaited<ReturnType<TGraph["invoke"]>>
>(graph: TGraph, label: string, ...args: TArgs): Promise<TResult> {
  const start = Date.now();

  // 実行
  const result = await graph.invoke(...args);

  const duration = Date.now() - start;
  const seconds = Math.floor(duration / 1000);
  const milliseconds = duration % 1000;

  console.log(`[${label} Graph] latency: ${seconds}s ${milliseconds}ms`);

  return result;
}
