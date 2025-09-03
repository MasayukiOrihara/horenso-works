import { useCallback, useEffect, useRef, useState } from "react";

export function useSendCount() {
  const countRef = useRef(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const saved = Number(sessionStorage.getItem("sendCount") ?? 0);
    setCount(saved);
    countRef.current = saved;
  }, []);

  const increment = useCallback(() => {
    if (typeof window !== "undefined") {
      countRef.current += 1;
      setCount(countRef.current);
      sessionStorage.setItem("sendCount", countRef.current.toString());
    }
  }, []);

  return { count, increment };
}
