import { BaseMessage } from "@langchain/core/messages";
import { put, head } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

import fs from "fs";
import path from "path";

import { QAEntry } from "@/lib/type";
import * as Path from "@/lib/path";
import { getBaseUrl, qaEntriesFilePath } from "@/lib/path";

// ダミーデータ
const initial: QAEntry = {
  id: "xxx",
  userAnswer: "",
  hint: "",
  metadata: { timestamp: "1970-01-01T00:00:00.000+00:00", quality: 0.5 },
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

/** これまでの会話を記憶 */
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

/** 講師の指摘から学ぶ */
export async function logLearn(learnText: string) {
  console.log("タグ付き入力で会話を指摘可能...");

  switch (true) {
    case learnText.includes("【エントリー】"):
      console.log("エントリーの入力");

      // 既存データを読み込む（なければ空配列）
      const qaList: QAEntry[] = readJson(Path.qaEntriesFilePath());

      // timestampが最大のもの（最新）を探す
      const latestEntry = qaList.reduce(
        (latest, entry) =>
          entry.metadata.timestamp > latest.metadata.timestamp ? entry : latest,
        initial
      );

      // 値の追加
      const qaEntry: QAEntry = {
        id: uuidv4(),
        userAnswer: latestEntry.userAnswer,
        hint: learnText.replace("【エントリー】", ""),
        metadata: {
          ...latestEntry.metadata,
          timestamp: Path.timestamp,
          quality: 0.5,
          source: "user",
        },
      };
      qaList.push(qaEntry);

      // 上書き保存（整形付き）
      fs.writeFileSync(
        Path.qaEntriesFilePath(),
        JSON.stringify(qaList, null, 2)
      );
      const entryFinishLog = `✅ エントリーデータを ${Path.qaEntriesFilePath()} に更新しました`;
      console.log(entryFinishLog);

      return entryFinishLog;
    case learnText.includes("【プロンプト】"):
      console.log("プロンプトの入力");

      // プロンプトに追加
      const result = " - " + learnText.replace("【プロンプト】", "") + "\n";
      // 指摘をファイルに書き出し
      await writeTextFile(Path.learnFilePath, result);

      const promptFinishLog = `✅ 指摘内容を ${Path.learnFileName} に保存しました。\n`;
      return promptFinishLog;
  }
  return "今回の変更はありません。";
}

/** 追加プロンプトの読み込み */
export async function readAddPrompt() {
  // 今日のファイルがあればそこから読む
  if (fs.existsSync(Path.learnFilePath)) {
    return fs.readFileSync(Path.learnFilePath, "utf-8");
  }

  const dir = path.dirname(Path.learnFilePath);
  const files = fs.readdirSync(dir);

  // 最新ファイルを探す
  const fullPaths = files
    .map((f) => ({
      file: f,
      fullPath: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtime.getTime(),
    }))
    .filter((entry) => fs.statSync(entry.fullPath).isFile());

  // フォルダは空
  if (fullPaths.length === 0) {
    return "";
  }

  // mtime（更新日時）で降順にソートして一番新しいものを取得
  const latest = fullPaths.sort((a, b) => b.mtime - a.mtime)[0];
  // その内容で新規作成
  const latestText = fs.readFileSync(latest.fullPath, "utf-8");

  fs.appendFileSync(Path.learnFilePath, latestText, "utf-8");
  console.log("⚠ ファイルが存在しなかったので、新しいファイルを作成しました。");

  return fs.readFileSync(Path.learnFilePath, "utf-8");
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

// ローカル or vercelにtxtファイル書き出し
const writeTextFile = async (path: string, result: string) => {
  const { host } = getBaseUrl();

  // ファイル書き出し
  if (host?.includes("localhost")) {
    // ローカル
    fs.appendFileSync(path, result, "utf-8");
    console.log(`✅ 会話内容を ${path} に保存しました。\n`);
  } else if (host?.includes("vercel")) {
    // vercel版
    await saveVercelText(path, result);
    console.log(`✅ 会話内容を ${path} に保存しました。\n`);
  } else {
    console.log("⚠ 記憶の保存ができませんでした。\n");
  }
};

// Json fileの読み込み
export const readJson = (path: string) => {
  if (fs.existsSync(path) && fs.statSync(path).size > 0) {
    const raw = fs.readFileSync(path, "utf-8");
    return JSON.parse(raw);
  }

  return [];
};

/* エントリーの更新関数 */
export function updateEntry(qaEntryId: string, text: string) {
  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = readJson(qaEntriesFilePath());

  // 値の更新
  const updated = qaList.map((qa) =>
    qa.id === qaEntryId && qa.hint === ""
      ? {
          ...qa,
          hint: text,
          metadata: {
            ...qa.metadata,
          },
        }
      : qa
  );
  // 上書き保存（整形付き）
  fs.writeFileSync(qaEntriesFilePath(), JSON.stringify(updated, null, 2));
  console.log(`✅ エントリーデータを ${qaEntriesFilePath()} に更新しました`);
}
