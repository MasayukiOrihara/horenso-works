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
  userAnswer: string; // 比較対象になる答え
  documents: Document[]; // 質問ドキュメント
  topK: number; // 上位からの比較個数
  allTrue?: boolean; // 全問正解で正解とするか
  semanticList: SemanticAnswerData;
};

/** ユーザーの回答データを管理する型 */
export type UserAnswerEvaluation = {
  question_id: string;
  userAnswer: string;
  currentAnswer: string;
  score: string;
  isAnswerCorrect: boolean;
};

/** エントリーデータを取り扱う型 */
export type QAEntry = {
  id: string;
  userAnswer: string;
  hint: string;
  embedding?: number[]; // ユーザーアンサーから生成されたベクトル
  metadata: {
    timestamp: string;
    quality: number; // 回答の信頼度（例0.0~1.0）
    question_id?: string; // 任意のカテゴリ
    source?: "user" | "admin" | "bot";
  };
};
export type QAMetadata = {
  hint: string;
  id: string;
  timestamp: string;
  quality: number;
  question_id?: string;
  source?: "user" | "admin" | "bot";
};

export type UsedEntry = { entry: Document; sum: number };

/** semantic で使う型 */
type SemanticMetadata = {
  parentId: string | number;
  question_id: string;
  timestamp: string;
  source: "user" | "admin" | "bot";
};
type SemanticAnswerEntry = {
  id: string;
  answer: string;
  reason: string;
  metadata: SemanticMetadata;
};
export type SemanticAnswerData = {
  who: SemanticAnswerEntry[][];
  why: SemanticAnswerEntry[][];
};

export type SemanticData = {
  id: string;
  answer: string;
  reason: string;
  metadata: {
    parentId: string;
    question_id: string;
    timestamp: string; // ISO形式の日時
    source: "admin" | "user" | "bot"; // 必要に応じてenum化も可能
  };
};
