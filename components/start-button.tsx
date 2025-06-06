"use client";

import { StartButtonProps } from "@/lib/type";
import { Button } from "./ui/button";

export const StartButton: React.FC<StartButtonProps> = ({
  started,
  setStarted,
}) => {
  if (started) return null;

  const handleStart = () => {
    setStarted(true);
  };

  return (
    <div>
      {!started && (
        <div className="absolute [width:calc(100%-3.5rem)] [height:calc(100%-2.75rem)] bg-zinc-600/60 z-10 overflow-hidden">
          <div className="flex items-center justify-center h-screen ">
            <Button
              onClick={handleStart}
              className=" bg-blue-500 hover:bg-blue-600 hover:cursor-pointer"
            >
              スタート
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
