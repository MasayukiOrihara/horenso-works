"use client";
import { useErrorStore } from "@/hooks/useErrorStore";

/**
 * エラー時に詳細メッセージをログに保存する
 */
export function ErrorBanner() {
  const { errors } = useErrorStore();
  if (errors.length === 0) return null;

  // const e = errors[0];
  // console.error(e);

  // ※※ 後でDB に送る処理を書く

  return null;
}
