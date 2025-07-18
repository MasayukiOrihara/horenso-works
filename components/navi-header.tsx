"use client";

import { Switch } from "@/components/ui/switch";
import { useSwitches } from "./provider/switch-provider";

export const Navi: React.FC = () => {
  const { learnOn, setLearnOn } = useSwitches();

  return (
    <div className="sticky mx-12 my-4 flex flex-col items-end">
      <div className="flex flex-row mb-2">
        <p className="text-xs mr-1">設定</p>
        <Switch
          checked={learnOn}
          onCheckedChange={setLearnOn}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
    </div>
  );
};
