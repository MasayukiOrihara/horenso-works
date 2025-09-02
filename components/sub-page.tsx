"use client";

import { MessageProvider } from "./messages/message-provider";
import { MessageInput } from "./messages/message-input";
import { SCREEN } from "./screen";
import { CorrectCheck } from "./debug/correctCheck";
import { MessageWindow } from "./messages/message-window";
import { MessageAi } from "./messages/message-ai";
import { useSettings } from "./provider/SettingsProvider";

export const SubPage: React.FC = () => {
  const { flags } = useSettings();
  return (
    <MessageProvider>
      <div className="w-full max-w-2xl h-full flex flex-col m-auto px-4 py-2 overflow-hidden">
        <div>
          <SCREEN />
          <MessageWindow />
        </div>
        <div>
          <MessageAi />
          <MessageInput />
        </div>
        {flags.checkOn && <CorrectCheck />}
      </div>
    </MessageProvider>
  );
};
