import { useState } from "react";
import { useMessages } from "./message-provider";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { SendHorizontalIcon } from "lucide-react";

export const MessageInput = () => {
  const [text, setText] = useState("");
  const { addUserMessage, aiState } = useMessages();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) {
          addUserMessage(text.trim());
          setText("");
        }
      }}
      className="my-4"
    >
      <div className="w-full flex flex-row">
        {/* テキストエリア */}
        <Input
          className="w-full p-2 mr-2 rounded shadow-xl text-zinc-400 placeholder:text-neutral-400 bg-white"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="[ENTER で 送信...]"
          disabled={aiState === "submitted"}
        />
        {/* ボタン */}
        <Button
          type="submit"
          className="w-24 bg-blue-400 text-white p-2 rounded hover:bg-blue-900 hover:cursor-pointer hover:text-white/40 self-end"
          disabled={aiState === "submitted"}
        >
          <SendHorizontalIcon />
        </Button>
      </div>
    </form>
  );
};
