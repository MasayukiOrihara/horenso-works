"use client";

import { SettingFlags } from "@/lib/type";
import React, { ReactNode } from "react";

type SettingsContextType = {
  flags: SettingFlags;
  setFlags: React.Dispatch<React.SetStateAction<SettingFlags>>;
};

const SettingsContext = React.createContext<SettingsContextType | null>(null);

// 初期値
const DEFAULT_FLAGS: SettingFlags = {
  memoryOn: true,
  learnOn: false,
  addPrompt: false,
  checkOn: false,
  shouldValidate: { who: false, why: true },
};

/**
 * SwitchProvider コンポーネント
 * @param param0
 * @returns
 */
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [flags, setFlags] = React.useState<SettingFlags>(DEFAULT_FLAGS);

  const value = React.useMemo(() => ({ flags, setFlags }), [flags]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

// カスタムフック
export function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
