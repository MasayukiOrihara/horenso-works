import { useState } from "react";
import { useUserMessages } from "./message-provider";

export const MessageInput = () => {
  const [text, setText] = useState("");
  const { addUserMessage } = useUserMessages();

  const handleEnterkey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        addUserMessage(text.trim());
        setText("");
      }
    }
  };

  return (
    <div className="w-full h-full">
      {/* テキストエリア */}
      <textarea
        className="w-full p-2 rounded shadow-xl text-zinc-400 placeholder:text-neutral-400"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleEnterkey}
        placeholder="[ENTER で 送信...]"
      />
    </div>
  );
};
