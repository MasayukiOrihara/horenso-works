"use client";

import { MessageProvider } from "./messages/message-provider";
import { MessageList } from "./messages/message-list";
import { MessageInput } from "./messages/message-input";
import { MessageAi } from "./messages/message-ai";
import { SCREEN } from "./screen";

export const SubPage: React.FC = () => (
  <MessageProvider>
    <div className="w-full max-w-4xl h-full flex flex-col m-auto px-4 py-2 overflow-hidden">
      <div>
        <SCREEN />
        <MessageAi />
      </div>
      <div>
        <MessageInput />
      </div>
    </div>
  </MessageProvider>
);
