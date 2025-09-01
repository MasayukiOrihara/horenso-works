"use client";

import { MessageProvider } from "./messages/message-provider";
import { MessageInput } from "./messages/message-input";
import { SCREEN } from "./screen";
import { Debuglog } from "./debug/debuglog";
import { useSwitches } from "./provider/switch-provider";
import { CorrectCheck } from "./debug/correctCheck";
import { MessageWindow } from "./messages/message-window";
import { MessageAi } from "./messages/message-ai";
import { SettingsModal } from "./SettingsModal/SettingsModal";

export const SubPage: React.FC = () => {
  const { learnOn, checkOn } = useSwitches();
  return (
    <MessageProvider>
      <div className="w-full max-w-2xl h-full flex flex-col m-auto px-4 py-2 overflow-hidden">
        <div>
          {learnOn && (
            <>
              <SettingsModal />
            </>
          )}
          <SCREEN />
          <MessageWindow />
        </div>
        <div>
          <MessageAi />
          <MessageInput />
        </div>
        {checkOn && <CorrectCheck />}
      </div>
    </MessageProvider>
  );
};
