import { useEffect, useState } from "react";
import { useUserMessages } from "./message-provider";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { SendHorizontalIcon } from "lucide-react";
import { useSwitches } from "../provider/switch-provider";

export const MessageInput = () => {
  const [text, setText] = useState("");
  const { addUserMessage, aiMessage, aiState } = useUserMessages();
  const { learnOn, inputTag, setInputTag } = useSwitches();

  // テキストアエリアにデバッグ用のタグを追加
  useEffect(() => {
    if (!text.includes("【エントリー】") && !text.includes("【プロンプト】")) {
      // ほかのタグが含まれない時
      setText((prev) => inputTag + prev);
      setInputTag("");
    }
  }, [inputTag, text, setInputTag]);

  const handleAiMessageCopy = () => {
    setText((prev) => prev + aiMessage);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) {
          addUserMessage(text.trim());
          setText("");
        }
      }}
      className={learnOn ? "" : "my-2"}
    >
      {learnOn && (
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={handleAiMessageCopy}
            disabled={aiMessage === ""}
            className="mb-2 hover:cursor-pointer"
          >
            ↓ 貼り付け ↓
          </Button>
        </div>
      )}
      <div className="w-full h-12 flex overflow-hidden">
        {/* テキストエリア */}
        <Input
          className="w-full h-full mr-2 rounded shadow-xl text-zinc-400 placeholder:text-neutral-400 bg-white"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="[ENTER で 送信...]"
          disabled={aiState === "submitted" || aiState === "streaming"}
        />
        {/* ボタン */}
        <Button
          type="submit"
          className="w-[20%] h-full bg-blue-400 text-white rounded hover:bg-blue-900 hover:cursor-pointer hover:text-white/40 self-end"
          disabled={aiState === "submitted" || aiState === "streaming"}
        >
          <SendHorizontalIcon />
        </Button>
      </div>
    </form>
  );
};
