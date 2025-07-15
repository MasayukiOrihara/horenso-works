import { flushLogs } from "./logBuffer";

export async function GET() {
  const encoder = new TextEncoder();

  let controllerRef: ReadableStreamDefaultController<string> | null = null;
  let closed = false;
  let interval: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      controllerRef = controller;
      interval = setInterval(() => {
        if (closed) return;
        const logs = flushLogs(); // 新着ログのみ
        for (const log of logs) {
          controller.enqueue(encoder.encode(`data: ${log}\n\n`));
        }
      }, 500); // 0.5秒ごとにログをチェック

      // 5分後に自動終了（オプション）
      setTimeout(() => {
        if (!closed && controllerRef) {
          closed = true;
          clearInterval(interval);
          try {
            controllerRef.close();
          } catch (e) {
            console.warn("Already closed:", e);
          }
        }
      }, 1000 * 60 * 5);
    },

    cancel() {
      if (!closed && controllerRef) {
        closed = true;
        clearInterval(interval);
        try {
          controllerRef.close(); // 念のための二重確認
        } catch (e) {
          console.warn("Already closed in cancel:", e);
        }
      }
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
