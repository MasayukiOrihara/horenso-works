import { flushLogs } from "./logBuffer";

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  let interval: NodeJS.Timeout | null = null;
  let closed = false;

  const safeClose = () => {
    if (closed) return;
    closed = true;

    if (interval) {
      clearInterval(interval);
      interval = null;
    }

    if (controllerRef) {
      try {
        controllerRef.close();
      } catch {
        // すでに閉じられている場合は無視
      } finally {
        controllerRef = null;
      }
    }
  };

  // クライアント切断（ナビゲーション/タブ閉じ）でも確実に終了
  req.signal.addEventListener("abort", safeClose);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;

      // 初回の「ダミー行」（SSEのウォームアップ/一部プロキシ対策）
      try {
        controller.enqueue(encoder.encode(`: connected\n\n`));
      } catch {
        safeClose();
        return;
      }

      // 0.3秒ごとに新着ログを送る
      interval = setInterval(() => {
        if (closed || !controllerRef) return;

        try {
          const logs = flushLogs();
          if (logs.length === 0) return;

          for (const log of logs) {
            controllerRef.enqueue(encoder.encode(`data: ${log}\n\n`));
          }
        } catch {
          // enqueue で「すでに閉じている」などが起きたら安全にクローズ
          safeClose();
        }
      }, 300);

      // タイムアウトで自動終了（任意）
      setTimeout(safeClose, 1000 * 60 * 5);
    },

    cancel() {
      // クライアントが明示的に cancel した場合
      safeClose();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Nginx等のバッファリングを止めたい場合
      "X-Accel-Buffering": "no",
    },
  });
}
