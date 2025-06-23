import { LangChainAdapter, Message as VercelChatMessage } from "ai";
import { put, head } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

import fs from "fs";
import path from "path";
import { LEARN_CHECK, POINT_OUT_LOG } from "@/lib/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { haiku3_5, strParser } from "@/lib/models";

import { BaseMessage } from "@langchain/core/messages";
import { QAEntry } from "@/lib/type";

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

    console.log(`✅ 会話内容を ${memoryFileName} に保存しました。\n`);
  } else if (host?.includes("vercel")) {
    // vercel版
    await saveVercelText(memoryFileName, result);
  } else {
    console.log("⚠ 記憶の保存ができませんでした。\n");
  }
}

/** 講師の指摘から学ぶ */
export async function logLearn(host: string, learnText: string) {
  console.log("タグ付き入力で会話を指摘可能...");
  console.log("【プロンプト】 → 追加プロンプトを入力");
  console.log("【エントリー】 → エントリーを入力");

  switch (true) {
    case learnText.includes("【エントリー】"):
      console.log("エントリーの入力");

      // 既存データを読み込む（なければ空配列）
      const qaEntriesFilePath = path.join(
        process.cwd(),
        "public",
        "advice",
        "qa-entries.json"
      );
      console.log("jsonファイルパス" + qaEntriesFilePath);

      let qaList: QAEntry[] = [];
      if (
        fs.existsSync(qaEntriesFilePath) &&
        fs.statSync(qaEntriesFilePath).size > 0
      ) {
        const raw = fs.readFileSync(qaEntriesFilePath, "utf-8");
        qaList = JSON.parse(raw);
      }

      // timestampが最大のもの（最新）を探す
      const latestEntry = qaList.reduce((latest, entry) =>
        entry.metadata.timestamp > latest.metadata.timestamp ? entry : latest
      );

      // 値の追加
      const qaEntry: QAEntry = {
        id: uuidv4(),
        userAnswer: latestEntry.userAnswer,
        hint: learnText.replace("【エントリー】", ""),
        metadata: {
          ...latestEntry.metadata,
          timestamp: new Date(Date.now()).toISOString(),
          quality: 0.5,
          source: "user",
        },
      };
      qaList.push(qaEntry);

      // 上書き保存（整形付き）
      fs.writeFileSync(qaEntriesFilePath, JSON.stringify(qaList, null, 2));
      console.log(`✅ エントリーデータを ${qaEntriesFilePath} に更新しました`);
      break;
    case learnText.includes("【プロンプト】"):
      console.log("プロンプトの入力");
      // 一時的な追加プロンプト
      let tempPrompt = "";

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
      break;
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
