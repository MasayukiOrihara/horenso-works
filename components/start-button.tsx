"use client";

import { useStartButton } from "./provider/start-button-provider";
import { Button } from "./ui/button";

export const StartButton: React.FC = () => {
  const { started, setStarted, debug, setDebug } = useStartButton();

  // 開始中なら何もしない
  if (started || debug) return null;

  return (
    <div>
      {!started && (
        <div className="absolute [width:calc(100%-3.5rem)] [height:calc(100%-2.75rem)] bg-zinc-600/60 z-10 overflow-hidden">
          <div className="flex flex-col items-center justify-start pt-44 h-screen  ">
            <Button
              onClick={() => setStarted(true)}
              size={"lg"}
              className="mb-2 bg-blue-500 hover:bg-blue-700 hover:cursor-pointer"
            >
              スタート
            </Button>

            <Button
              onClick={() => setDebug(true)}
              variant={"ghost"}
              size={"md"}
              className="hover:bg-zinc-50/50 hover:cursor-pointer"
            >
              デバッグ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
