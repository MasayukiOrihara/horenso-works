import { useEffect, useState } from "react";
import { MessageAi } from "../messages/message-ai";

type Props = {
  onSend: (log: string[]) => void;
};

/**
 * サーバー側から出力されるログを表示する
 */
export const LogViewer: React.FC<Props> = ({ onSend }) => {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const eventSource = new EventSource("/api/horenso/lib/log");

    eventSource.onmessage = (event) => {
      setLogs((prev) => {
        const nextLogs = [...prev, event.data].slice(-10);
        return nextLogs;
      });
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // 送信
  useEffect(() => {
    onSend(logs);
  }, [logs]);

  return null;
};
