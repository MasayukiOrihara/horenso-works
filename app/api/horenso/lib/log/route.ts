import { flushLogs } from "./logBuffer";

/**
 * クライアントに対して、0.5秒ごとに新着ログを送り続ける。
 * @returns
 */
export async function GET() {
  // 文字列を変換するエンコーダ
  const encoder = new TextEncoder();

  let controllerRef: ReadableStreamDefaultController<string> | null = null;
  let closed = false;
  let interval: NodeJS.Timeout;

  function safeClose() {
    if (!closed && controllerRef) {
      closed = true;
      clearInterval(interval);
      try {
        controllerRef.close();
      } catch (e) {
        console.warn("Already closed:", e);
      }
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      controllerRef = controller;
      interval = setInterval(() => {
        if (closed) return;
        const logs = flushLogs(); // 新着ログのみ
        for (const log of logs) {
          // SSEの仕様に従った形式。
          controller.enqueue(encoder.encode(`data: ${log}\n\n`));
        }
      }, 500); // 0.5秒ごとにログをチェック

      // 5分後に自動終了（オプション）
      setTimeout(safeClose, 1000 * 60 * 5);
    },

    cancel() {
      safeClose();
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
