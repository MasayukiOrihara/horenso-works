"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export const Navi: React.FC = () => {
  const [learnOn, setLearnOn] = useState(false);
  const [memoryOn, setMemoryOn] = useState(false);

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
    </div>
  );
};
