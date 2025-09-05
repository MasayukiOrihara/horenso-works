"use client";

import * as React from "react";
import { DEFAULT_SESSION_FLAGS } from "./useHorensoChat";
import { SessionFlags } from "@/lib/type";

function isBrowser() {
  return typeof window !== "undefined";
}

// ── バリデータ（壊れたJSONや型崩れ対策）
function isSessionFlags(v: unknown): v is SessionFlags {
  if (typeof v !== "object" || v === null) return false;
  const o = v as any;
  return (
    typeof o.sessionId === "string" &&
    typeof o.state === "string" &&
    typeof o.step === "number" &&
    typeof o.options === "object" &&
    o.options !== null
  );
}

type UseSessionFlagsStorageArgs = {
  /** 保存キー。バージョン上げると安全に切替えできます */
  storageKey?: string;
  /** 初期値（サーバーから初回で貰う場合はここで渡す or 後から set でOK） */
  initial?: SessionFlags;
};

export function useSessionFlagsStorage({
  storageKey = "horenso/sessionFlags/v1",
  initial = DEFAULT_SESSION_FLAGS,
}: UseSessionFlagsStorageArgs = {}) {
  const read = React.useCallback(() => {
    if (!isBrowser()) return initial;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      return isSessionFlags(parsed) ? parsed : initial;
    } catch {
      return initial;
    }
  }, [storageKey, initial]);

  const [value, setValueState] = React.useState(read);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setValueState(read());
    setHydrated(true);
  }, [read]);

  const setValue = React.useCallback(
    (next: React.SetStateAction<typeof value>) => {
      setValueState((prev) => {
        const resolved =
          typeof next === "function"
            ? (next as (p: typeof prev) => typeof prev)(prev)
            : next;
        try {
          if (isBrowser()) {
            sessionStorage.setItem(storageKey, JSON.stringify(resolved));
          }
        } catch {
          /* quota 等は必要なら toast */
        }
        return resolved;
      });
    },
    [storageKey]
  );

  const reset = React.useCallback(() => {
    try {
      if (isBrowser()) sessionStorage.removeItem(storageKey);
    } catch {}
    setValueState(initial);
  }, [storageKey, initial]);

  // ── よく使う更新ヘルパ（任意）
  const merge = React.useCallback(
    (patch: Partial<typeof value>) => {
      setValue((prev) => ({ ...prev, ...patch }));
    },
    [setValue]
  );

  const mergeOptions = React.useCallback(
    (patch: Partial<(typeof value)["options"]>) => {
      setValue((prev) => ({ ...prev, options: { ...prev.options, ...patch } }));
    },
    [setValue]
  );

  return { value, setValue, merge, mergeOptions, reset, hydrated };
}
