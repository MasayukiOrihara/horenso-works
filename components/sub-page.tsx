"use client";

import { MessageProvider } from "./messages/message-provider";
import { MessageInput } from "./messages/message-input";
import { MessageAi } from "./messages/message-ai";
import { SCREEN } from "./screen";
import { StartButtonProps } from "@/lib/type";

export const SubPage: React.FC<{ started: boolean }> = ({ started }) => (
  <MessageProvider>
    <div className="w-full max-w-4xl h-full flex flex-col m-auto px-4 py-2 overflow-hidden">
      <div>
        <SCREEN />
        <MessageAi started={started} />
      </div>
      <div>
        <MessageInput />
      </div>
    </div>
  </MessageProvider>
);
