// LangGraph 全体の処理時間を計測するユーティリティ
export async function measureExecution<
  TGraph extends { invoke: (...args: any[]) => Promise<any> }
>(
  graph: TGraph,
  label: string,
  ...args: Parameters<TGraph["invoke"]>
): Promise<ReturnType<TGraph["invoke"]>> {
  // 計測開始
  const start = Date.now();
  // 実行
  const result = await graph.invoke(...args);
  // 計測終了
  const duration = Date.now() - start;
  // 計算してログに出力
  const seconds = Math.floor(duration / 1000);
  const milliseconds = duration % 1000;
  console.log(`[${label} Graph] latency: ${seconds}s ${milliseconds}ms`);

  return result;
}
