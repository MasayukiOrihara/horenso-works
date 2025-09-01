"use client";

import React from "react";
import { SettingsButton } from "./SettingsModal/SettingsButton";
import { SettingsModal } from "./SettingsModal/SettingsModal";

export const Navi: React.FC = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="">
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
  );
};
