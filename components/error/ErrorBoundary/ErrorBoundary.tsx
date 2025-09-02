"use client";
import React from "react";

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: unknown): State {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : String(err),
    };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // TODO: ログ送信（Sentry など）
    console.error("UI Error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 rounded-lg border bg-red-50 p-4 text-sm text-red-700">
          予期せぬエラーが発生しました。
          <br />
          {process.env.NODE_ENV === "development" && (
            <code className="block mt-2 text-xs">{this.state.message}</code>
          )}
          <button
            className="mt-3 rounded bg-red-600 px-3 py-1 text-white"
            onClick={() => location.reload()}
          >
            画面を再読み込み
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
