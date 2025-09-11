import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BaseUrlInfo } from "./type";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

// 時間取得（JST）
export function toJSTISOString(date = new Date()) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000); // UTC+9
  return jstDate.toISOString().replace("Z", "+09:00");
}

type MessageContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: string | { url: string } }
  | { type: "input_text"; text: string }
  | { type: "tool_call"; id?: string; name?: string; args?: unknown }
  | Record<string, unknown>; // その他将来拡張

/** LangChainの result から「人間が読むテキスト」を安全に取り出す */
export function extractOutputText(result: unknown): string {
  // 1) すでに string
  if (typeof result === "string") return result;

  // 2) LangChain BaseMessage / AIMessage っぽい（今回のケース）
  //    {"lc":1,"type":"constructor","id":["langchain_core","messages","AIMessage"],"kwargs":{...}}
  if (typeof result === "object" && result !== null) {
    const r = result as { kwargs?: { content?: unknown }; content?: unknown };

    if (r?.kwargs?.content !== undefined) {
      return normalizeMessageContent(r.kwargs.content);
    }
    if (r?.content !== undefined) {
      return normalizeMessageContent(r.content);
    }
  }

  // 3) ChatResult / LLMResult / generations[]
  //    e.g. { generations: [{ text, message }], ...}
  if (
    typeof result === "object" &&
    result !== null &&
    Array.isArray((result as any).generations) &&
    (result as any).generations.length > 0
  ) {
    const generations = (result as any).generations as Array<any>;
    const gen0 = Array.isArray(generations[0])
      ? generations[0][0]
      : generations[0];
    // LangChainの世代は text または message を持つ
    if (typeof gen0?.text === "string") return gen0.text;
    if (gen0?.message?.content !== undefined) {
      return normalizeMessageContent(gen0.message.content);
    }
  }

  // 4) OutputParser でオブジェクトにされた場合
  //    よくある key: "output" / "answer" / "content" などを試す
  if (typeof result === "object" && result !== null) {
    const r = result as { output?: string; answer?: string; content?: string };
    if (r.output) return r.output;
    if (r.answer) return r.answer;
    if (r.content) return r.content;
  }

  // 5) 最後の手段：JSON
  try {
    return JSON.stringify(result);
  } catch {
    return String(result);
  }
}

/** Message.content が string / MessageContent[] どちらでも受け取れるよう正規化 */
export function normalizeMessageContent(content: unknown): string {
  // string ならそのまま
  if (typeof content === "string") return content;

  // OpenAI/LC の MessageContent[]（マルチモーダル対応）
  if (Array.isArray(content)) {
    const parts = content as MessageContentPart[];
    // text 系だけつなぐ（画像URLやtool_callはログに要らない想定）
    const texts = parts
      .map((p) => {
        if ("type" in p && p.type === "text" && typeof p.text === "string") {
          return p.text;
        }
        if (
          "type" in p &&
          p.type === "input_text" &&
          typeof p.text === "string"
        ) {
          return p.text;
        }
        return "";
      })
      .filter(Boolean);
    if (texts.length > 0) return texts.join("");
  }

  // それ以外は toString or JSON
  if (content?.toString && content.toString !== Object.prototype.toString) {
    try {
      const s = content.toString();
      if (s && s !== "[object Object]") return s;
    } catch {}
  }
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}
