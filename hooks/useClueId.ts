import { useEffect, useState } from "react";

/**
 * ブラウザ側でclue ID を管理するためのフック
 * @returns
 */
export function useClueId() {
  const [clueId, setClueIdState] = useState<string | null>();

  useEffect(() => {
    const stored = sessionStorage.getItem("clue_id");
    if (stored) {
      setClueIdState(stored);
    }
  }, []);

  const setClueId = (id: string | null) => {
    if (id) {
      sessionStorage.setItem("clue_id", id);
    } else {
      sessionStorage.removeItem("clue_id");
    }
    setClueIdState(id);
  };
  return { clueId, setClueId };
}
