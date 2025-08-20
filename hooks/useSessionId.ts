import { useState, useEffect } from "react";

/**
 * ブラウザ側でセッションID を管理するためのフック
 * @returns
 */
export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    let id = sessionStorage.getItem("session_id");
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("session_id", id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}
