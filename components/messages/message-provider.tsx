import React, { createContext, useContext, useState, ReactNode } from "react";

type UserMessageContextType = {
  userMessages: string[];
  addUserMessage: (msg: string) => void;
  aiMessage: string;
  setAiMessage: (msg: string) => void;
  currentUserMessage: string;
  aiState: string;
  setAiState: (msg: string) => void;
};

const MessageContext = createContext<UserMessageContextType | undefined>(
  undefined
);

export const MessageProvider = ({ children }: { children: ReactNode }) => {
  const [userMessages, setUserMessages] = useState<string[]>([]);
  const [aiMessage, setAiMessage] = useState("");
  const [aiState, setAiState] = useState("");

  /** メッセージを追加する関数 */
  const addUserMessage = (msg: string) => {
    setUserMessages((prev) => [...prev, msg]);
  };

  /** 最新のユーザーメッセージを取得 */
  const currentUserMessage = userMessages[userMessages.length - 1];

  return (
    <MessageContext.Provider
      value={{
        userMessages,
        addUserMessage,
        aiMessage,
        setAiMessage,
        currentUserMessage,
        aiState,
        setAiState,
      }}
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
