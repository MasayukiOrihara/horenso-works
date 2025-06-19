import { LangChainAdapter, Message as VercelChatMessage } from "ai";
import { put, head } from "@vercel/blob";

import fs from "fs";
import path from "path";
import { LEARN_CHECK, POINT_OUT_LOG } from "@/lib/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { haiku3_5, strParser } from "@/lib/models";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import { BaseMessage } from "@langchain/core/messages";

// 変数
const timestamp = new Date().toISOString();
const named = timestamp.slice(0, 10);
const memoryFileName = `memory-${named}.txt`;
const learnFileName = `learn-${named}.txt`;
const memoryFilePath = path.join(process.cwd(), "memory", memoryFileName);
const learnFilePath = path.join(process.cwd(), "learn", learnFileName);

/** 履歴用に整形 */
export const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

/* LangChainメッセージをOpenAI形式に変換する */
function convertToOpenAIFormat(langchainMessage: BaseMessage) {
  const roleMapping = {
    human: "user",
    ai: "assistant",
    system: "system",
    tool: "tool",
    function: "function",
  } as const;

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

/** ベースURLを取得 */
export function getBaseUrl(req: Request) {
  const host = req.headers.get("host") ?? "";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  return { host, protocol, baseUrl };
}

/** これまでの会話を記憶 */
export async function logMessage(host: string, message: BaseMessage) {
  console.log("会話を記憶中...");

  // テキストの整形
  const formatted = convertToOpenAIFormat(message);
  const cleaned = `${formatted.role}: ${formatted.content}`;
  const result =
    cleaned.replace(/[\r\n]+/g, "") + "\n - " + timestamp.slice(0, 16) + "\n";

  logShort("書き出す内容: \n" + result);

  // ファイル書き出し(ローカル)
  if (host?.includes("localhost")) {
    fs.appendFileSync(memoryFilePath, result, "utf-8");

    console.log(`✅ 会話内容を ${memoryFileName} に保存しました。`);
  } else if (host?.includes("vercel")) {
    // vercel版
    await saveVercelText(memoryFileName, result);
  } else {
    console.log("⚠ 記憶の保存ができませんでした。");
  }
}

/** 講師の指摘から学ぶ */
export async function logLearn(host: string, learnText: string) {
  console.log("会話を指摘可能...");

  // 一時的な追加プロンプト
  let tempPrompt = "";

  const learnTemplate = LEARN_CHECK;
  const learnPrompt = PromptTemplate.fromTemplate(learnTemplate);
  const isInstructionalResponse = await learnPrompt
    .pipe(haiku3_5)
    .pipe(strParser)
    .invoke({
      user_input: learnText,
    });
  console.log("指摘かどうか: " + isInstructionalResponse);

  if (isInstructionalResponse.includes("YES")) {
    // プロンプトに追加
    tempPrompt += learnText + "\n";
    const result = " - " + learnText + "\n";

    // 指摘をファイルに書き出し
    if (host?.includes("localhost")) {
      fs.appendFileSync(learnFilePath, result, "utf-8");

      console.log(`✅ 指摘内容を ${learnFileName} に保存しました。`);
    } else if (host?.includes("vercel")) {
      // vercel に保存
      await saveVercelText(learnFileName, result);
    } else {
      console.log("⚠ 記憶の保存ができませんでした。");
    }

    // 定型文を吐いて会話を抜ける
    const fakeModel = new FakeListChatModel({
      responses: [POINT_OUT_LOG],
    });
    const fakePrompt = PromptTemplate.fromTemplate("");
    const fakeStream = await fakePrompt.pipe(fakeModel).stream({});
    return LangChainAdapter.toDataStreamResponse(fakeStream);
  }
}

/** vercelでの書き込み処理 */
async function saveVercelText(fileName: string, writeText: string) {
  let existingContent = "";

  try {
    // 既存ファイルの存在確認
    const blobInfo = await head(fileName);
    if (blobInfo) {
      // 既存ファイルを読み込み
      const response = await fetch(blobInfo.url);
      existingContent = await response.text();
    }
  } catch (error) {
    // ファイルが存在しない場合は空文字列のまま
    console.log(
      "⚠ ファイルが存在しなかったので、新しいファイルを作成しました。: " + error
    );
  }
  // 既存内容 + 新しい内容
  const updatedContent = existingContent + writeText;
  const blob = await put(fileName, updatedContent, {
    access: "public",
    contentType: "text/plain",
    allowOverwrite: true, // 上書きを許可
  });
  console.log(`✅ 会話内容を ${blob.url} に保存しました。`);
}
