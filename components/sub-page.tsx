"use client";

import { MessageProvider } from "./messages/message-provider";
import { MessageInput } from "./messages/message-input";
import { MessageAi } from "./messages/message-ai";
import { SCREEN } from "./screen";
import { Debuglog } from "./debug/debuglog";
import { useSwitches } from "./provider/switch-provider";
import { CurrentCheck } from "./debug/currentCheck";
import LogViewer from "./debug/logViewer";

export const SubPage: React.FC = () => {
  const { learnOn } = useSwitches();
  return (
    <MessageProvider>
      <div className="w-full max-w-4xl h-full flex flex-col m-auto px-4 py-2 overflow-hidden">
        <div>
          {learnOn && <Debuglog />}
          <SCREEN />
          <LogViewer />
        </div>
        <div>
          <MessageInput />
        </div>
        <CurrentCheck />
      </div>
    </MessageProvider>
  );
};
