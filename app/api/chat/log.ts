import { BaseMessage } from "@langchain/core/messages";
import * as Path from "@/lib/path";
import { writeTextFile } from "./utils";

/** 会話を記憶 */
export async function logMessage(message: BaseMessage) {
  console.log("会話を記憶中...");

  // テキストの整形
  const formatted = convertToOpenAIFormat(message);
  const cleaned = `${formatted.role}: ${formatted.content}`;
  const result =
    cleaned.replace(/[\r\n]+/g, "") +
    "\n - " +
    Path.timestamp.slice(0, 16) +
    "\n";
  logShort("書き出す内容: \n" + result);

  // 書き出し
  await writeTextFile(Path.memoryFilePath, result);
}
/* LangChainメッセージをOpenAI形式に変換する */
function convertToOpenAIFormat(langchainMessage: BaseMessage) {
  const roleMapping = {
    human: "user",
    ai: "assistant",
    system: "system",
    tool: "tool",
    function: "function",
  } as const;

  // 型変換
  const messageType = langchainMessage.getType() as keyof typeof roleMapping;

  return {
    role: roleMapping[messageType],
    content: langchainMessage.content,
  };
}

/** ログを全文書かないようにする処理 */
const logShort = (msg: string, max = 30) => {
  const trimmed = msg.length > max ? msg.slice(0, max) + "... \n" : msg;
  console.log(trimmed);
};
