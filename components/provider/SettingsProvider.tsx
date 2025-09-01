"use client";

import { ShouldValidate } from "@/lib/type";
import React, { ReactNode, useContext, useState } from "react";

type SettingsContextValue = {
  flags: SettingFlags;
  setFlags: React.Dispatch<React.SetStateAction<SettingFlags>>;
  inputTag: string;
  setInputTag: (value: string) => void;
};

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

// ShouldValidate
type SettingFlags = {
  memoryOn: boolean; // 会話履歴の保存フラグ
  learnOn: boolean; // 学習モードの保存フラグ
  addPrompt: boolean; // 追加プロンプトの試用フラグ
  checkOn: boolean; // ?
  shouldValidate: ShouldValidate; // AI 回答チェックを行うかのフラグ
};

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
  const [inputTag, setInputTag] = useState("");

  const value = React.useMemo(
    () => ({ flags, setFlags, inputTag, setInputTag }),
    [flags, inputTag]
  );

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
