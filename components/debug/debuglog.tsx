import React, { useEffect } from "react";
import { useUserMessages } from "../messages/message-provider";
import { Button } from "../ui/button";
import { useSwitches } from "../provider/switch-provider";
import { Switch } from "@/components/ui/switch";
import { shouldValidateAPI } from "@/lib/api/api";

let message = "";

/** 設定画面 */
export const Debuglog: React.FC = () => {
  const { currentUserMessage } = useUserMessages();
  const {
    setInputTag,
    memoryOn,
    setMemoryOn,
    addPromptOn,
    setAddPromptOn,
    checkOn,
    setCheckOn,
    shouldVidateOn,
    setShouldVidateOn,
  } = useSwitches();

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

  // shouldの分解
  const whoShouldValidate = shouldVidateOn.who;
  const whyShouldValidate = shouldVidateOn.why;

  useEffect(() => {
    const fetchData = async () => {
      await shouldValidateAPI(shouldVidateOn);
    };
    fetchData();
  }, [shouldVidateOn]);

  return (
    <div className="absolute z-10 py-2 px-4 bg-zinc-600/70 text-sm rounded">
      <h1 className="mb-2">
        ◎ この画面の状態でタグをつけて送信すると AI の中身を多少変更できます。
      </h1>
      <div className="flex text-zinc-100">
        <div className="flex flex-col ">
          {/* ユーザーメッセージの表示 */}
          <div>
            <h2>直近のユーザーメッセージ: </h2>
            <p>{message}</p>
          </div>

          {/* エントリー追加ボタン */}
          <div className="flex items-center">
            <Button
              variant={"outline"}
              onClick={handleEntryButtonClick}
              className="text-xs px-2 py-1 my-1"
            >
              エントリー
            </Button>
            <h2 className="ml-2">
              直近のユーザーメッセージに対する返答例を追加
            </h2>
          </div>

          {/* プロンプト追加ボタン */}
          <div className="flex items-center">
            <Button
              variant={"outline"}
              onClick={handlePromptButtonClick}
              className="text-xs px-2 py-1 my-1"
            >
              プロンプト
            </Button>
            <h2 className="ml-2">プロンプトを新しく追加 </h2>
          </div>
        </div>
        <div className="ml-8">
          {/* 会話履歴を保存する */}
          <div className="flex flex-row items-center mb-1">
            <Switch
              checked={memoryOn}
              onCheckedChange={setMemoryOn}
              className="data-[state=checked]:bg-blue-500"
            />
            <p className="ml-2">会話履歴の保存</p>
          </div>

          {/* 追加プロンプトを使用する */}
          <div className="flex flex-row items-center mb-1">
            <Switch
              checked={addPromptOn}
              onCheckedChange={setAddPromptOn}
              className="data-[state=checked]:bg-blue-500"
            />
            <p className="ml-2">追加プロンプトの有効化</p>
          </div>

          {/* 正答判定を使用する */}
          <div className="flex flex-row items-center mb-1">
            <Switch
              checked={checkOn}
              onCheckedChange={setCheckOn}
              className="data-[state=checked]:bg-blue-500"
            />
            <p className="ml-2">正答判定アンケートの有効化</p>
          </div>

          {/* 回答が適正かどうかのチェックを使用する */}
          <div className="flex flex-row items-center mb-1">
            <div className="flex flex-row items-center mr-4">
              <p>「誰が」</p>
              <Switch
                checked={whoShouldValidate}
                onCheckedChange={(value) =>
                  setShouldVidateOn((prev) => ({ ...prev, who: value }))
                }
                className="data-[state=checked]:bg-blue-500"
              />
            </div>

            <div className="flex flex-row items-center">
              <p>「なぜ」</p>
              <Switch
                checked={whyShouldValidate}
                onCheckedChange={(value) =>
                  setShouldVidateOn((prev) => ({ ...prev, why: value }))
                }
                className="data-[state=checked]:bg-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
