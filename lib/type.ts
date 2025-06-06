import { BaseMessage } from "@langchain/core/messages";
import { Document } from "langchain/document";

/** フラグ管理用 */
export type HorensoStates = {
  isAnswerCorrect: boolean; // 質問に正解したか
  hasQuestion: boolean; // 次の質問はあるか
  step: number; // ステップ数
};

/** スタートボタン用のprops */
export type StartButtonProps = {
  started: boolean;
  setStarted: (val: boolean) => void;
};

/** 学び・記憶用のprops */
export type MemorizingProps = {
  memoryOn: boolean;
  setMemoryOn: (val: boolean) => void;
  learnOn: boolean;
  setLearnOn: (val: boolean) => void;
};

/** 正解判定で使う型 */
export type MatchAnswerArgs = {
  messages: BaseMessage[]; // 一連の会話(messages)
  documents: Document[]; // 質問ドキュメント
  topK: number; // 上位からの比較個数
  threshold: number; // スコアの閾値
  allTrue?: boolean; // 全問正解で正解とするか
};
