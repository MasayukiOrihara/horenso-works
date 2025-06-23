"use client";

import React, { ReactNode, useContext, useState } from "react";

type SwitchContextType = {
  memoryOn: boolean;
  setMemoryOn: (value: boolean) => void;
  learnOn: boolean;
  setLearnOn: (value: boolean) => void;
  inputTag: string;
  setInputTag: (value: string) => void;
};

const SwitchContext = React.createContext<SwitchContextType | undefined>(
  undefined
);

/**
 * SwitchProvider コンポーネント
 * @param param0
 * @returns
 */
export const SwitchProvider = ({ children }: { children: ReactNode }) => {
  const [memoryOn, setMemoryOn] = useState(true);
  const [learnOn, setLearnOn] = useState(false);
  const [inputTag, setInputTag] = useState("");

  return (
    <SwitchContext.Provider
      value={{
        memoryOn,
        setMemoryOn,
        learnOn,
        setLearnOn,
        inputTag,
        setInputTag,
      }}
    >
      {children}
    </SwitchContext.Provider>
  );
};

// カスタムフック
export const useSwitches = () => {
  const context = useContext(SwitchContext);
  if (!context) {
    throw new Error("useSwitchies must be used within a SwitchProvider");
  }
  return context;
};
