"use client";

import { MessageProvider } from "./messages/message-provider";
import { MessageInput } from "./messages/message-input";
import { MessageAi } from "./messages/message-ai";
import { SCREEN } from "./screen";
import { Debuglog } from "./debuglog";
import { useSwitches } from "./provider/switch-provider";

export const SubPage: React.FC = () => {
  const { learnOn } = useSwitches();
  return (
    <MessageProvider>
      <div className="w-full max-w-4xl h-full flex flex-col m-auto px-4 py-2 overflow-hidden">
        <div>
          {learnOn && <Debuglog />}
          <SCREEN />
          <MessageAi />
        </div>
        <div>
          <MessageInput />
        </div>
      </div>
    </MessageProvider>
  );
};
