"use client";

import { Switch } from "@/components/ui/switch";
import { useSettings } from "./provider/SettingsProvider";

export const Navi: React.FC = () => {
  const { flags, setFlags } = useSettings();

  return (
    <div className="sticky mx-12 my-4 flex flex-col items-end">
      <div className="flex flex-row mb-2">
        <p className="text-xs mr-1">設定</p>
        <Switch
          checked={flags.learnOn}
          onCheckedChange={(v) => setFlags((s) => ({ ...s, learnOn: v }))}
          className="data-[state=checked]:bg-blue-500"
        />
      </div>
    </div>
  );
};
