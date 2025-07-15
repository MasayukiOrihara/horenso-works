// グローバルなログバッファ（簡易メモリログ）
export const logBuffer: string[] = [];

export function pushLog(msg: string) {
  logBuffer.push(msg);
}

export function flushLogs(): string[] {
  const logs = [...logBuffer];
  logBuffer.length = 0;
  return logs;
}
