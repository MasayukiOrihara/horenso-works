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
  documents: Document<HorensoMetadata>[]; // 質問ドキュメント
  topK: number; // 上位からの比較個数
  allTrue?: boolean; // 全問正解で正解とするか
  shouldValidate?: boolean; // 適正チェックを行うかどうかのフラグ
};

/** エントリーデータを取り扱う型 */
export type QADocumentMetadata = {
  hint: string;
  id: string;
  timestamp: string;
  quality: number;
  question_id?: string;
  source?: "user" | "admin" | "bot";
};
type QAMetadata = {
  timestamp: string;
  quality: number; // 回答の信頼度（例0.0~1.0）
  question_id?: string; // 任意のカテゴリ
  source?: "user" | "admin" | "bot";
};
export type QAEntry = {
  id: string;
  userAnswer: string;
  hint: string;
  embedding?: number[]; // ユーザーアンサーから生成されたベクトル
  metadata: QAMetadata;
};
export type UsedEntry = { entry: Document; sum: number };

export type ShouldValidate = {
  who: boolean;
  why: boolean;
};

/* フロントからバックへ送るチャットリクエスト設定 */
export type ChatRequestOptions = {
  memoryOn: boolean;
  learnOn: boolean;
  addPromptOn: boolean;
  debug: boolean;
  step: number;
};

/**
 * ユーザーの回答を評価した結果の型
 * 主に正誤判定処理（match）で使う
 */
export type Evaluation = {
  input: UserAnswerEmbedding; // 入力
  document: Document<HorensoMetadata>; // 照合対象
  documentScore: DocumentScore; // ドキュメント正答の結果
  WrongScore?: FuzzyScore; // 外れリストの結果
  fuzzyScore?: FuzzyScore; // あいまい正答の結果
  answerCorrect: AnswerCorrect; // 最終結果
};
// 入力
export type UserAnswerEmbedding = {
  userAnswer: string; // ユーザーの答え
  embedding: number[]; // ベクターデータ
};
// ドキュメント正答
export type DocumentScore = {
  id: string;
  score: number; // 類似性スコア
  correct: AnswerCorrect; // 正解判定
};
// あいまい正答
export type FuzzyScore = {
  id: string;
  score: number; // 類似性スコア
  nearAnswer?: string; // 類似した答え
  reason?: string; // このスコアになった理由
  correct: AnswerCorrect; // 正解判定
};
// 正解判定
export type AnswerCorrect = "correct" | "incorrect" | "unknown";

/**
 * ドキュメント評価で使う Document のメタデータ
 */
export type HorensoMetadata = {
  parentId: string;
  question_id: string;
  question: string;
  answerLeakWords?: string[];
  isMatched: boolean;
};

/**
 * あいまい評価で使う Document のメタデータ
 */
export type PhrasesMetadata = {
  id?: string;
  question_id: string;
  parentId: string | null;
  timestamp: string;
  rationale?: string;
  source: "user" | "admin" | "bot";
};

/**
 * 会話に統一感を持たせるために過去回答保存用 Document のメタデータ
 */
export type ClueMetadata = {
  id: string;
  question_id: string;
  clue: string;
  quality: number;
  source: "user" | "admin" | "bot";
};
