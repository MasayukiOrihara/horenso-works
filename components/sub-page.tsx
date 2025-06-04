"use client";

import { MessageProvider } from "./messages/message-provider";
import { MessageList } from "./messages/message-list";
import { MessageInput } from "./messages/message-input";
import { MessageAi } from "./messages/message-ai";

export const SubPage: React.FC = () => (
  <MessageProvider>
    <div className="w-full h-full px-4 py-2 bg-white">
      <div className="w-full">
        <MessageAi />
      </div>
      <MessageList />
      <MessageInput />
    </div>
  </MessageProvider>
);
