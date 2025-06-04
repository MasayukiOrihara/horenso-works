/** フラグ管理用 */
export type HorensoOldStates = {
  isStarted: boolean;
  isTarget: boolean;
  isReason: boolean;
  checkTarget: boolean;
  checkReason: boolean;
};
export type HorensoFlags = {
  deadline: boolean;
  function: boolean;
  quality: boolean;
};

export type HorensoStates = {
  isInitialRun: boolean;
  isAnswerCorrect: boolean;
  hasQuestion: boolean;
};
