"use client";

import { Switch } from "@/components/ui/switch";
import { useSwitches } from "./provider/switch-provider";

export const Navi: React.FC = () => {
  const {
    memoryOn,
    setMemoryOn,
    learnOn,
    setLearnOn,
    addPromptOn,
    setAddPromptOn,
  } = useSwitches();

  return (
    <div className="sticky mx-12 my-4 flex flex-col items-end">
      <div className="flex flex-row mb-2">
        <p className="text-xs mr-1">マナビ</p>
        <Switch
          checked={learnOn}
          onCheckedChange={setLearnOn}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
      <div className="flex flex-row mb-2">
        <p className="text-xs mr-1">キオク</p>
        <Switch
          checked={memoryOn}
          onCheckedChange={setMemoryOn}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
      <div className="flex flex-row mb-2">
        <p className="text-xs mr-1">ツイカ</p>
        <Switch
          checked={addPromptOn}
          onCheckedChange={setAddPromptOn}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
    </div>
  );
};
