"use client";

import { useState } from "react";
import { SettingsButton } from "./SettingsModal/SettingsButton";
import { SettingsModal } from "./SettingsModal/SettingsModal";

/**
 * 設定とボタンの表示
 * @returns
 */
export const Navi: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [debugMode, setDebugMode] = useState<boolean>(false);

  // .envで切り替え
  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === "true";
  console.log(isDebugMode);
  if (isDebugMode && !debugMode) {
    setDebugMode(true);
  }

  return (
    <>
      {debugMode && (
        <div>
          <div className="fixed right-4 top-14 z-10">
            <SettingsButton
              onOpen={() => setOpen(true)}
              controlsId="settings-modal"
            />
          </div>
          <SettingsModal
            id="settings-modal"
            open={open}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
};
