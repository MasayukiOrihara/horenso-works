"use client";

import React from "react";
import { FramedCard } from "../ui/FramedCard";
import { useSessionFlags } from "../provider/SessionFlagsProvider";

/**
 * スコアの表示
 * @returns
 */
export const ScoreHeader: React.FC = () => {
  const { value: sessionFlags } = useSessionFlags();

  return (
    <div className="fixed left-40 top-14 z-10">
      <FramedCard title="スコア">
        <h1>あなたのスコア</h1>
        <h2 className="text-2xl text-center font-bold">
          {sessionFlags.data?.grade ? <>{sessionFlags.data?.grade}</> : <>-</>}
        </h2>
      </FramedCard>
    </div>
  );
};
