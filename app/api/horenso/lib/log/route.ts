import { flushLogs } from "./logBuffer";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const interval = setInterval(() => {
        const logs = flushLogs(); // 新着ログのみ
        for (const log of logs) {
          controller.enqueue(encoder.encode(`data: ${log}\n\n`));
        }
      }, 500); // 0.5秒ごとにログをチェック

      // 5分後に自動終了（オプション）
      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 1000 * 60 * 5);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
