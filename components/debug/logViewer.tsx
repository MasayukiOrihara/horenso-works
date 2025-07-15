import { useEffect, useState } from "react";
import { MessageAi } from "../messages/message-ai";

/**
 * サーバー側から出力されるログを表示する
 */
export default function LogViewer() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource("/api/horenso/lib/log");

    eventSource.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div>
      <MessageAi logs={logs} />
    </div>
  );
}
