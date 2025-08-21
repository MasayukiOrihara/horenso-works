import { BaseMessage, MessageContent } from "@langchain/core/messages";

// 返り値の型を定義
export type OpenAIMessage = {
  role: "user" | "assistant" | "system" | "tool" | "function";
  content: string;
};

/* LangChainメッセージをOpenAI形式に変換する */
export const convertToOpenAIFormat = (message: BaseMessage): OpenAIMessage => {
  const roleMapping = {
    human: "user",
    ai: "assistant",
    system: "system",
    tool: "tool",
    function: "function",
  } as const;

  return {
    role: roleMapping[message.getType() as keyof typeof roleMapping],
    content: getContentString(message),
  };
};

/* messages から文字列取得関数 */
const getContentString = (msg: BaseMessage): string => {
  const content: MessageContent = msg.content;

  if (typeof content === "string") {
    return content;
  } else if (Array.isArray(content)) {
    // 配列の場合は再帰的に文字列化
    return content
      .map((c) => getContentString({ ...msg, content: c } as BaseMessage))
      .join("\n");
  } else if (typeof content === "object" && content !== null) {
    // オブジェクトの場合は JSON 文字列化
    return JSON.stringify(content);
  }

  return String(content);
};

/** ログを全文書かないようにする処理 */
export const logShort = (msg: string, max = 30) => {
  const trimmed = msg.length > max ? msg.slice(0, max) + "... \n" : msg;
  console.log(trimmed);
};
