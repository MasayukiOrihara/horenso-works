"use client";
import { useErrorStore } from "@/hooks/useErrorStore";

export function ErrorBanner() {
  const { errors, remove } = useErrorStore();
  if (errors.length === 0) return null;

  const e = errors[0];
  return (
    <div className="fixed left-1/2 top-4 z-50 w-[min(720px,90vw)] -translate-x-1/2 rounded-lg border border-red-300 bg-red-50 p-3 text-red-800 shadow">
      <div className="font-medium">エラーが発生しました</div>
      <div className="mt-1 text-sm">{e.message}</div>
      {process.env.NODE_ENV === "development" && e.detail && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-white p-2 text-xs text-red-700">
          {e.detail}
        </pre>
      )}
      <div className="mt-2 text-right">
        <button
          className="rounded bg-red-600 px-3 py-1 text-white"
          onClick={() => remove(e.id)}
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
