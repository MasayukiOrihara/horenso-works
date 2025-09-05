import { Document } from "langchain/document";

/** フラグ管理用 */
export type HorensoStates = {
  isAnswerCorrect: boolean; // 質問に正解したか
  hasQuestion: boolean; // 次の質問はあるか
};

/** 法会連想ワークグラフから返すオブジェクトの型 */
export type HorensoWorkResponse = {
  text: string;
  sessionFlags: SessionFlags;
};
export type ChatGraphResult = {
  memory: string;
  userprofile: string;
  userMessage: string;
  context: string;
};

/** 正解判定で使う型 */
export type MatchAnswerArgs = {
  userAnswer: string; // 比較対象になる答え
  documents: Document<HorensoMetadata>[]; // 質問ドキュメント
  topK: number; // 上位からの比較個数
  allTrue?: boolean; // 全問正解で正解とするか
  sessionFlags: SessionFlags; // sessionで管理させるフラグ
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
  vector: number[]; // ベクターデータ
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
  expectedAnswerId: string; // 回答識別番号
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
  expectedAnswerId: string; // 回答識別番号
  questionId: string; // 問題番号
  question: string; // 問題内容
  answerLeakWords?: string[]; // 禁止ワード
  isMatched: boolean; // 正解してるかどうか
  maxVector?: number; // 回答時の最大ベクターデータ
};

/**
 * あいまい評価で使う Document のメタデータ
 */
export type PhrasesMetadata = {
  id?: string;
  questionId: string;
  expectedAnswerId: string | null;
  rationale?: string;
  source: "user" | "admin" | "bot";
};

/**
 * 会話に統一感を持たせるために過去回答保存用 Document のメタデータ
 */
export type ClueMetadata = {
  id: string;
  questionId: string;
  clue: string;
  quality: number;
  source: "user" | "admin" | "bot";
};
/** 評価済みの clue */
export type AdjustedClue = {
  id: string;
  rankScore: number; // 返答を順位付けで取得するためのスコア
  clue: string; // 返答のための手がかり
  quality: number; // 信頼度
};

/**
 * フロント側から渡す設定関連のフラグ
 */
export type SettingFlags = {
  memoryOn: boolean; // 会話履歴の保存フラグ
  learnOn: boolean; // 学習モードの保存フラグ
  addPrompt: boolean; // 追加プロンプトの試用フラグ
  checkOn: boolean; // 正誤判定アンケートの試用フラグ
  shouldValidate: ShouldValidate; // AI 回答チェックを行うかのフラグ
};

/** session strage で管理するフラグ */
type ProgressState = "locked" | "in_progress" | "cleared";
export type ShouldValidate = {
  who: boolean;
  why: boolean;
};
export type MatchThreshold = {
  maxBase: number;
  minBase: number;
  maxWrong: number;
  maxFuzzy: number;
};
export type SessionOptions = {
  debugOn: boolean; // デバッグモード化
  memoryOn: boolean; // 会話履歴を保存するか
  questionnaireOn: boolean; // 正答アンケートを行う
  aiValidateOn: ShouldValidate; // ai チェックを行う
  threshold: MatchThreshold; // 正解判定で使う閾値
  clueId?: string; // 現在設定したclueのID
};
export type SessionFlags = {
  sessionId: string; // セッション自体のID
  state: ProgressState; // 進行状況
  step: number; // 問題のステップ数
  options: SessionOptions; // 設定できるオプション
};

/** グレード関連 */
export type Similarities = { expectedAnswerId: string; similarity: number };
