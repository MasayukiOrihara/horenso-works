"use client";

import { MessageProvider } from "./messages/message-provider";
import { MessageInput } from "./messages/message-input";
import { SCREEN } from "./screen";
import { CorrectCheck } from "./debug/correctCheck";
import { MessageWindow } from "./messages/message-window";
import { ChatConnector } from "./messages/ChatConnector";
import { useSessionFlags } from "./provider/SessionFlagsProvider";
import { ScoreHeader } from "./Score/ScoreHeader";

export const SubPage: React.FC = () => {
  const { value: sessionFlags } = useSessionFlags();

  return (
    <MessageProvider>
      <div className="w-full max-w-2xl h-full flex flex-col m-auto mt-30 px-4 py-2 overflow-hidden">
        {sessionFlags.phase === "cleared" && <ScoreHeader />}
        <div>
          <SCREEN />
          <MessageWindow />
        </div>
        <div>
          <ChatConnector />
          <MessageInput />
        </div>
        {sessionFlags.options.questionnaireOn && <CorrectCheck />}
      </div>
    </MessageProvider>
  );
};
