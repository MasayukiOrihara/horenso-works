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
