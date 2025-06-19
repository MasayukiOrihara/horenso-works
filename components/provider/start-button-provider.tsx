"use client";

import React, {
  Dispatch,
  ReactNode,
  SetStateAction,
  useContext,
  useState,
} from "react";

type StartButtonContextType = {
  started: boolean;
  setStarted: (value: boolean) => void;
  debug: boolean;
  setDebug: (value: boolean) => void;
  step: number;
  setStep: Dispatch<SetStateAction<number>>;
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
  const [step, setStep] = useState(0);

  return (
    <StartButtonContext.Provider
      value={{ started, setStarted, debug, setDebug, step, setStep }}
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
