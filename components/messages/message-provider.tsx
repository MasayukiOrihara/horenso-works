import React, { createContext, useContext, useState, ReactNode } from "react";

type UserMessageContextType = {
  userMessages: string[];
  addUserMessage: (msg: string) => void;
  aiState: string;
  setAiState: (msg: string) => void;
};

const MessageContext = createContext<UserMessageContextType | undefined>(
  undefined
);

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const [userMessages, setUserMessages] = useState<string[]>([]);
  const [aiState, setAiState] = useState("");

  const addUserMessage = (msg: string) => {
    setUserMessages((prev) => [...prev, msg]);
  };

  return (
    <MessageContext.Provider
      value={{ userMessages, addUserMessage, aiState, setAiState }}
    >
      {children}
    </MessageContext.Provider>
  );
};

export const useUserMessages = () => {
  const context = useContext(MessageContext);
  if (!context)
    throw new Error("useMessages must be used within MessageProvider");
  return context;
};
