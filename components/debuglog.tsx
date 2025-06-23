import React, { useEffect } from "react";
import { useUserMessages } from "./messages/message-provider";
import { Button } from "./ui/button";
import { useSwitches } from "./provider/switch-provider";

let message = "";

export const Debuglog: React.FC = () => {
  const { currentUserMessage } = useUserMessages();
  const { setInputTag } = useSwitches();

  const handleEntryButtonClick = () => {
    setInputTag("【エントリー】");
  };
  const handlePromptButtonClick = () => {
    setInputTag("【プロンプト】");
  };

  // 指摘後長文を出さないようにするため
  useEffect(() => {
    if (!currentUserMessage) return;

    if (
      !currentUserMessage.includes("【エントリー】") &&
      !currentUserMessage.includes("【プロンプト】")
    ) {
      // タグが含まれない時のみ表示
      message = currentUserMessage;
    }
  }, [currentUserMessage]);

  return (
    <div className="absolute z-10 text-zinc-400">
      <div>
        <h2 className="text-zinc-600">直近のユーザーメッセージ: </h2>
        <p>{message}</p>
      </div>

      <div className="flex items-center">
        <h2 className="text-zinc-600">
          直近のユーザーメッセージに対する返答例を追加:
        </h2>
        <Button
          variant={"outline"}
          onClick={handleEntryButtonClick}
          className="ml-2"
        >
          エントリー
        </Button>
      </div>

      <div className="flex items-center">
        <h2 className="text-zinc-600">プロンプトを追加: </h2>
        <Button
          variant={"outline"}
          onClick={handlePromptButtonClick}
          className="ml-2"
        >
          プロンプト
        </Button>
      </div>
    </div>
  );
};
