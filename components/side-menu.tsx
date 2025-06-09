import React, { useState } from "react";
import { X } from "lucide-react";
import { MessageSquare, FileText } from "lucide-react";
import { SidebarHistory } from "./sidebar/sidebar-history";
import { SidebarPrompt } from "./sidebar/sidebar-prompt";

export const SideMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState<"history" | "prompt" | null>(null);

  return (
    <aside className="text-zinc-300 w-14 min-h-0 bg-zinc-100 border-r border-zinc-200 p-4">
      <div className="w-full text-zinc-600">
        {/* トリガーボタン（画面左上） */}
        <button
          title="会話履歴"
          onClick={() => {
            setIsOpen(true);
            setContent("history");
          }}
          className="mb-4 hover:cursor-pointer"
        >
          <MessageSquare />
        </button>

        <button
          title="追加プロンプト"
          onClick={() => {
            setIsOpen(true);
            setContent("prompt");
          }}
          className="mb-4 hover:cursor-pointer"
        >
          <FileText />
        </button>
      </div>

      {/* オーバーレイ背景 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* サイドバー本体（左からスライド） */}
      <div
        className={`fixed top-0 left-0 h-full overflow-y-auto w-100 bg-white shadow-lg z-50 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">サイドバー</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>
        {content === "history" && <SidebarHistory />}
        {content === "prompt" && <SidebarPrompt />}
      </div>
    </aside>
  );
};
