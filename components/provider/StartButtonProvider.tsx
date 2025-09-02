"use client";

import React, {
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

type StartButtonContextType = {
  startButtonFlags: StartButtonFlags;
  setStartButtonFlags: React.Dispatch<React.SetStateAction<StartButtonFlags>>;
};

const StartButtonContext = React.createContext<StartButtonContextType | null>(
  null
);

type StartButtonFlags = {
  started: boolean;
  debug: boolean;
  step: number;
};

// 初期値
const DEFAULT_FLAGS: StartButtonFlags = {
  started: false,
  debug: false,
  step: 0,
};

/**
 * StartButtonProvider コンポーネント
 * @param param0
 * @returns
 */
export const StartButtonProvider = ({ children }: { children: ReactNode }) => {
  const [startButtonFlags, setStartButtonFlags] =
    React.useState<StartButtonFlags>(DEFAULT_FLAGS);

  const value = React.useMemo(
    () => ({ startButtonFlags, setStartButtonFlags }),
    [startButtonFlags]
  );

  return (
    <StartButtonContext.Provider value={value}>
      {children}
    </StartButtonContext.Provider>
  );
};

// カスタムフック
export const useStartButton = () => {
  const context = useContext(StartButtonContext);
  if (!context) {
    throw new Error("useStartButton must be used within a StartButtonProvider");
  }
  return context;
};
