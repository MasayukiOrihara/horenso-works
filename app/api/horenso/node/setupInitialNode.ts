import { HorensoStates, SessionFlags } from "@/lib/type";

import * as MSG from "@/lib/contents/horenso/template";
import { QuestionStatsRepo } from "@/lib/supabase/repositories/questionStats.repo";

type InitialNode = {
  sessionFlags: SessionFlags;
};

/**
 * 初期設定を行う最初のノード
 * @param transitionStates
 * @param debugStep
 */
export async function setupInitialNode({ sessionFlags }: InitialNode) {
  // 問題の初期化
  const transition: HorensoStates = {
    isAnswerCorrect: false,
    hasQuestion: sessionFlags.step === 1 ? false : true,
  };

  // リトライ回数更新
  const r = await QuestionStatsRepo.incRetry(
    sessionFlags.sessionId,
    String(sessionFlags.step + 1)
  );
  if (!r.ok) throw r.error;

  // 前提・背景・状況
  const contexts = [];
  contexts.push(MSG.BULLET + MSG.INSTRUCTOR_INTRO_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.USER_QUESTION_LABEL_PROMPT + "\n");

  // 問題分岐
  switch (sessionFlags.step) {
    case 0:
      contexts.push(MSG.FOR_REPORT_COMMUNICATION);
      break;
    case 1:
      contexts.push(MSG.REPORT_REASON_FOR_LEADER + MSG.THREE_ANSWER);
      break;
  }

  return { contexts, transition };
}
