"use client";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SideMenu } from "@/components/side-menu";
import { SubPage } from "@/components/sub-page";
import { Navi } from "@/components/navi-header";
import { StartButton } from "@/components/start-button";
import { useState } from "react";
import { MessageProvider } from "@/components/messages/message-provider";

export default function Home() {
  const [started, setStarted] = useState(false);
  const [memoryOn, setMemoryOn] = useState(true);
  const [learnOn, setLearnOn] = useState(true);

  return (
    <MessageProvider>
      <div className="h-screen flex flex-col bg-zinc-100">
        <Header />
        <div className="flex flex-1">
          <SideMenu />
          <StartButton started={started} setStarted={setStarted} />
          <main className="flex-1 flex flex-col">
            <Navi
              memoryOn={memoryOn}
              setMemoryOn={setMemoryOn}
              learnOn={learnOn}
              setLearnOn={setLearnOn}
            />
            <SubPage started={started} memoryOn={memoryOn} learnOn={learnOn} />
            <Footer />
          </main>
        </div>
      </div>
    </MessageProvider>
  );
}
