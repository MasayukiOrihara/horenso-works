import { HorensoStates } from "@/lib/type";

import * as MSG from "../contents/messages";

type InitialNode = {
  states: HorensoStates;
  debugStep: number;
};

/**
 * 初期設定を行う最初のノード
 * @param transitionStates
 * @param debugStep
 */
export function setupInitialNode({ states, debugStep }: InitialNode) {
  // デバッグ時にstepを設定
  if (debugStep != 0) states.step = debugStep;

  // 前回ターンの状態を反映
  console.log("前回ターンの状態変数");
  console.log(states);

  // 前提・背景・状況
  const contexts = [];
  contexts.push(MSG.BULLET + MSG.INSTRUCTOR_INTRO_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.USER_QUESTION_LABEL_PROMPT + "\n");

  // 問題分岐
  switch (states.step) {
    case 0:
      contexts.push(MSG.FOR_REPORT_COMMUNICATION);
      break;
    case 1:
      contexts.push(MSG.REPORT_REASON_FOR_LEADER + MSG.THREE_ANSWER);
      break;
  }

  return { states, contexts };
}
