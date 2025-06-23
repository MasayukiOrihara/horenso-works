import React from "react";
import { useUserMessages } from "./messages/message-provider";
import { Button } from "./ui/button";
import { useSwitches } from "./provider/switch-provider";

export const Debuglog: React.FC = () => {
  const { currentUserMessage } = useUserMessages();
  const { setInputTag } = useSwitches();

  const handleEntryButtonClick = () => {
    setInputTag("【エントリー】");
  };

  const handlePromptButtonClick = () => {
    setInputTag("【プロンプト】");
  };

  return (
    <div className="absolute z-10 text-zinc-400">
      <div>
        <h2 className="text-zinc-600">直近のユーザーメッセージ: </h2>
        <p>{currentUserMessage}</p>
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
