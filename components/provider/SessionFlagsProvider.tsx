"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { SessionFlags, SessionOptions, ShouldValidate } from "@/lib/type";

import * as MTC from "@/lib/contents/match";

const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  debugOn: false,
  memoryOn: true,
  questionnaireOn: false,
  aiValidateOn: { who: false, why: true },
  clueId: "",
  threshold: {
    maxBase: MTC.BASE_MATCH_SCORE,
    minBase: MTC.BASE_WORST_SCORE,
    maxWrong: MTC.WRONG_MATCH_SCORE,
    maxFuzzy: MTC.FUZZY_MATCH_SCORE,
  },
};
export const DEFAULT_SESSION_FLAGS: SessionFlags = {
  sessionId: "",
  phase: "locked",
  sync: "idle",
  step: 0,
  options: DEFAULT_SESSION_OPTIONS,
};

type Ctx = {
  value: SessionFlags;
  setValue: React.Dispatch<React.SetStateAction<SessionFlags>>;
  merge: (patch: Partial<SessionFlags>) => void;
  mergeOptions: (patch: Partial<SessionFlags["options"]>) => void;
  setValidate: (k: keyof ShouldValidate, v: boolean) => void;
  reset: () => void;
  hydrated: boolean;
};

const SessionFlagsContext = createContext<Ctx | null>(null);

type Props = {
  children: React.ReactNode;
  /** セッションごとの保存キー（任意） */
  storageKey?: string;
  /** サーバから渡したい初期値（任意） */
  initial?: SessionFlags;
};

export function SessionFlagsProvider({
  children,
  storageKey = "horenso/sessionFlags/v1",
  initial = DEFAULT_SESSION_FLAGS,
}: Props) {
  // SSRと一致させるため、初期は必ず同じ値
  const [value, setValue] = useState<SessionFlags>(initial);
  const [hydrated, setHydrated] = useState(false);

  // マウント後に sessionStorage → state を同期
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const next = JSON.parse(raw) as SessionFlags;
        setValue((prev) => ({ ...prev, ...next })); // 既定値とマージ
      } else {
        // まだ何も無ければ initial を保存しておく
        sessionStorage.setItem(storageKey, JSON.stringify(initial));
      }
    } catch {
      /* noop */
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // 値が変わったら永続化
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {}
  }, [storageKey, value]);

  const merge = (patch: Partial<SessionFlags>) =>
    setValue((prev) => ({ ...prev, ...patch }));

  const mergeOptions = (patch: Partial<SessionFlags["options"]>) =>
    setValue((prev) => ({ ...prev, options: { ...prev.options, ...patch } }));

  const setValidate = (k: keyof ShouldValidate, v: boolean) =>
    setValue((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        aiValidateOn: { ...prev.options.aiValidateOn, [k]: v },
      },
    }));

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {}
    setValue(initial);
  }, [storageKey, initial, setValue]);

  const ctx = useMemo<Ctx>(
    () => ({
      value,
      setValue,
      merge,
      mergeOptions,
      setValidate,
      reset,
      hydrated,
    }),
    [value, reset, hydrated]
  );

  return (
    <SessionFlagsContext.Provider value={ctx}>
      {children}
    </SessionFlagsContext.Provider>
  );
}

export function useSessionFlags() {
  const ctx = useContext(SessionFlagsContext);
  if (!ctx)
    throw new Error(
      "useSessionFlags must be used within <SessionFlagsProvider />"
    );
  return ctx;
}
