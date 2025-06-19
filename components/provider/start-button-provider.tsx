"use client";

import React, { ReactNode, useContext, useState } from "react";

type StartButtonContextType = {
  started: boolean;
  setStarted: (value: boolean) => void;
  debug: boolean;
  setDebug: (value: boolean) => void;
};

const StartButtonContext = React.createContext<
  StartButtonContextType | undefined
>(undefined);

/**
 * StartButtonProvider コンポーネント
 * @param param0
 * @returns
 */
export const StartButtonProvider = ({ children }: { children: ReactNode }) => {
  const [started, setStarted] = useState(false);
  const [debug, setDebug] = useState(false);

  return (
    <StartButtonContext.Provider
      value={{ started, setStarted, debug, setDebug }}
    >
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
