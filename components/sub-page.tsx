"use client";

import { MessageInput } from "./messages/message-input";
import { MessageAi } from "./messages/message-ai";
import { SCREEN } from "./screen";

export const SubPage: React.FC<{
  started: boolean;
  memoryOn: boolean;
  learnOn: boolean;
}> = ({ started, memoryOn, learnOn }) => (
  <div className="w-full max-w-4xl h-full flex flex-col m-auto px-4 py-2 overflow-hidden">
    <div>
      <SCREEN />
      <MessageAi started={started} memoryOn={memoryOn} learnOn={learnOn} />
    </div>
    <div>
      <MessageInput />
    </div>
  </div>
);
