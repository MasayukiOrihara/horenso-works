import path from "path";

/** ベースURLを取得 */
export const getBaseUrl = (req: Request) => {
  const host = req.headers.get("host") ?? "";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  return { host, protocol, baseUrl };
};

// qa-entries.json のファイルパス
export const qaEntriesFilePath = (host: string) => {
  if (host?.includes("vercel")) {
    // vercel
    return path.join("/tmp", "qa-entries.json");
  } else {
    // ローカル
    return path.join(process.cwd(), "public", "advice", "qa-entries.json");
  }
};

// semantic-match-answer.json のファイルパス
export const semanticFilePath = (host: string) => {
  if (host?.includes("vercel")) {
    // vercel
    return path.join("/tmp", "semantic-match-answer.json");
  } else {
    // ローカル
    return path.join(
      process.cwd(),
      "public",
      "semantic",
      "semantic-match-answer.json"
    );
  }
};

function toJSTISOString(date = new Date()) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000); // UTC+9
  return jstDate.toISOString().replace("Z", "+09:00");
}

// 現在時間（JST）
export const timestamp = toJSTISOString();

// 今日の日付
export const named = timestamp.slice(0, 10);

// マナビ & キオクのファイルパス関係
export const memoryFileName = `memory-${named}.txt`;
export const memoryFilePath = path.join(
  process.cwd(),
  "memory",
  memoryFileName
);
export const learnFileName = `learn-${named}.txt`;
export const learnFilePath = path.join(process.cwd(), "learn", learnFileName);
