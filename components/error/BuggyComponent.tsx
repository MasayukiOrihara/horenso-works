"use client";

export function BuggyComponent() {
  // レンダリング時に必ず例外を投げる
  throw new Error("テスト用エラー: BuggyComponent 爆発しました 🚨");
  return <div>これは表示されない</div>;
}
