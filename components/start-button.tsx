"use client";

import { useStartButton } from "./provider/start-button-provider";
import { Button } from "./ui/button";

export const StartButton: React.FC = () => {
  const { started, setStarted, debug, setDebug, step, setStep } =
    useStartButton();

  // 開始中なら何もしない
  if (started || debug) return null;

  return (
    <div>
      {!started && (
        <div className="absolute [width:calc(100%-3.5rem)] [height:calc(100%-2.75rem)] bg-zinc-600/60 z-30 overflow-hidden">
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
              className="mb-1 h-7"
            >
              デバッグ
            </Button>
            {/** この辺にデバック用のステッパー */}
            <div className="flex items-center gap-2 text-xs">
              <Button
                onClick={() => setStep((v) => Math.max(0, v - 1))}
                variant={"ghost"}
                className="px-2 py-1 bg-gray-200/20"
              >
                -
              </Button>
              <span className="w-2 text-center">{step}</span>
              <Button
                onClick={() => setStep((v) => Math.min(1, v + 1))}
                variant={"ghost"}
                className="px-2 py-1 bg-gray-200/20"
              >
                +
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
