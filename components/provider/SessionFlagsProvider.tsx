"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { MatchThreshold, SessionFlags, ShouldValidate } from "@/lib/type";
import { DEFAULT_SESSION_FLAGS } from "@/lib/contents/defaultValue/sessionflags";

type Ctx = {
  value: SessionFlags;
  setValue: React.Dispatch<React.SetStateAction<SessionFlags>>;
  merge: (patch: Partial<SessionFlags>) => void;
  mergeOptions: (patch: Partial<SessionFlags["options"]>) => void;
  setValidate: (k: keyof ShouldValidate, v: boolean) => void;
  setThreshold: (k: keyof MatchThreshold, v: number) => void;
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
        initial.sync = "idle";
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

  // 一部の値を変更する
  const merge = useCallback((patch: Partial<SessionFlags>) => {
    setValue((prev) => ({ ...prev, ...patch }));
  }, []);

  // オプション内の値を変更する
  const mergeOptions = (patch: Partial<SessionFlags["options"]>) =>
    setValue((prev) => ({ ...prev, options: { ...prev.options, ...patch } }));

  // validate の値を個々で変更する
  const setValidate = (k: keyof ShouldValidate, v: boolean) =>
    setValue((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        aiValidateOn: { ...prev.options.aiValidateOn, [k]: v },
      },
    }));

  // threshold の値を個々で変更する
  const setThreshold = (k: keyof MatchThreshold, v: number) =>
    setValue((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        threshold: { ...prev.options.threshold, [k]: v },
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
      setThreshold,
      reset,
      hydrated,
    }),
    [value, merge, reset, hydrated]
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
