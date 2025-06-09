import React, { useState } from "react";
import { X } from "lucide-react";
import { MessageSquare } from "lucide-react";
import { useMessages } from "./messages/message-provider";

export const SideMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { userMessages, aiMessages } = useMessages();

  // 交互にマージする関数
  function mergeAlternating(user: string[], ai: string[]) {
    const result = [];
    const maxLength = Math.max(user.length, ai.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < user.length) result.push("user: " + user[i]);
      if (i < ai.length) result.push("ai: " + ai[i]);
    }
    return result;
  }

  return (
    <aside className="text-zinc-300 w-14 min-h-0 bg-zinc-100 border-r border-zinc-200 p-4">
      <div>
        {/* トリガーボタン（画面左上） */}
        <button
          onClick={() => setIsOpen(true)}
          className="w-full text-zinc-600 hover:cursor-pointer"
        >
          <MessageSquare />
        </button>

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
            <h2 className="text-lg font-semibold">会話履歴</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:cursor-pointer"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="p-4 space-y-1 text-sm text-zinc-500">
            {mergeAlternating(userMessages, aiMessages).map((msg, idx) => (
              <div key={idx}>{msg}</div>
            ))}
          </nav>
        </div>
      </div>
    </aside>
  );
};
