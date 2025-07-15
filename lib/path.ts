import path from "path";

type BaseUrlInfo = {
  host: string;
  protocol: "http" | "https";
  baseUrl: string;
};

/** ベースURLを取得 */
let cachedBaseUrl: BaseUrlInfo | null = null;
export const getBaseUrl = (req?: Request) => {
  // すでにキャッシュされていれば返す
  if (cachedBaseUrl) return cachedBaseUrl;

  // req がない場合は環境変数を使って構築する
  if (!req) {
    const host = process.env.NEXT_PUBLIC_BASE_HOST ?? "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    cachedBaseUrl = {
      host,
      protocol,
      baseUrl: `${protocol}://${host}`,
    };
    return cachedBaseUrl;
  }

  const host = req.headers.get("host") ?? "";
  const protocol = host.includes("localhost") ? "http" : "https";
  cachedBaseUrl = {
    host,
    protocol,
    baseUrl: `${protocol}://${host}`,
  };
  return cachedBaseUrl;
};

// qa-entries.json のファイルパス
export const qaEntriesFilePath = () => {
  const { host } = getBaseUrl();

  if (host?.includes("vercel")) {
    // vercel
    return path.join("/tmp", "qa-entries.json");
  } else {
    // ローカル
    return path.join(process.cwd(), "public", "advice", "qa-entries.json");
  }
};

// semantic-match-answer.json のファイルパス
export const semanticFilePath = () => {
  const { host } = getBaseUrl();

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

// not-correct.json のファイルパス
export const notCrrectFilePath = () => {
  const { host } = getBaseUrl();

  if (host?.includes("vercel")) {
    // vercel
    return path.join("/tmp", "not-correct.json");
  } else {
    // ローカル
    return path.join(process.cwd(), "public", "semantic", "not-correct.json");
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
  "public",
  "memory",
  memoryFileName
);
export const learnFileName = `learn-${named}.txt`;
export const learnFilePath = path.join(
  process.cwd(),
  "public",
  "learn",
  learnFileName
);
