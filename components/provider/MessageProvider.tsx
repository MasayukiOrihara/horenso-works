import { useChat } from "@ai-sdk/react";
import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
  ReactNode,
} from "react";

/* ---------- types ---------- */
type ChatStatus = ReturnType<typeof useChat>["status"];
type State = {
  userMessages: string[];
  aiMessage: string;
  chatStatus: ChatStatus;
};

type Action =
  | { type: "ADD_USER_MESSAGE"; msg: string }
  | { type: "SET_AI_MESSAGE"; msg: string }
  | { type: "SET_CHAT_STATUS"; value: ChatStatus }
  | { type: "RESET" };

type Ctx = {
  userMessages: string[];
  addUserMessage: (msg: string) => void;
  aiMessage: string;
  setAiMessage: (msg: string) => void;
  chatStatus: ChatStatus;
  setChatStatus: (value: ChatStatus) => void;
  currentUserMessage: string | undefined;
  reset: () => void;
};

/* ---------- reducer ---------- */
const initialState: State = {
  userMessages: [],
  aiMessage: "",
  chatStatus: "ready" as ChatStatus,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_USER_MESSAGE":
      return { ...state, userMessages: [...state.userMessages, action.msg] };
    case "SET_AI_MESSAGE":
      return { ...state, aiMessage: action.msg };
    case "SET_CHAT_STATUS":
      return { ...state, chatStatus: action.value };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

/* ---------- context ---------- */
const MessageContext = createContext<Ctx | undefined>(undefined);

/* ---------- provider ---------- */
export function MessageProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addUserMessage = useCallback(
    (msg: string) => dispatch({ type: "ADD_USER_MESSAGE", msg }),
    []
  );
  const setAiMessage = useCallback(
    (msg: string) => dispatch({ type: "SET_AI_MESSAGE", msg }),
    []
  );
  const setChatStatus = useCallback(
    (value: ChatStatus) => dispatch({ type: "SET_CHAT_STATUS", value }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  const currentUserMessage = useMemo(() => {
    const arr = state.userMessages;
    return arr.length ? arr[arr.length - 1] : undefined;
  }, [state.userMessages]);

  const value = useMemo<Ctx>(
    () => ({
      userMessages: state.userMessages,
      addUserMessage,
      aiMessage: state.aiMessage,
      setAiMessage,
      chatStatus: state.chatStatus,
      setChatStatus,
      currentUserMessage,
      reset,
    }),
    [
      state.userMessages,
      state.aiMessage,
      state.chatStatus,
      addUserMessage,
      setAiMessage,
      setChatStatus,
      currentUserMessage,
      reset,
    ]
  );

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
}

/* ---------- hook ---------- */
export function useUserMessages() {
  const ctx = useContext(MessageContext);
  if (!ctx)
    throw new Error("useUserMessages must be used within <MessageProvider>");
  return ctx;
}
