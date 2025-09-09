import { useEffect, useState } from "react";
import { useUserMessages } from "../provider/MessageProvider";

type Props = {
  onSend: (log: string[]) => void;
};

const HORENSO_LOG_PATH = "/api/horenso/lib/log";

/**
 * サーバー側から出力されるログを表示する
 */
export const LogViewer: React.FC<Props> = ({ onSend }) => {
  const { chatStatus } = useUserMessages();
  const [logs, setLogs] = useState<string[]>([]);

  const shouldConnect =
    chatStatus === "streaming" || chatStatus === "submitted";
  useEffect(() => {
    console.log(chatStatus);
    // streaming 状態じゃなければ接続しない
    if (!shouldConnect) return;

    // SSE 接続
    const eventSource = new EventSource(HORENSO_LOG_PATH);

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
  }, [shouldConnect]);

  // 送信
  useEffect(() => {
    onSend(logs);
  }, [logs, onSend]);

  return null;
};
