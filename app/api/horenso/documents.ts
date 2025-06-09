import { HorensoStates } from "@/lib/type";
import { Document } from "langchain/document";

// 質問ドキュメント1
export const whoDocuments: Document[] = [
  {
    pageContent: "リーダー",
    metadata: {
      id: "1",
      question_id: "1",
      question: "報連相は誰のためか",
      isMatched: false,
    },
  },
  {
    pageContent: "上司",
    metadata: {
      id: "2",
      question_id: "1",
      question: "報連相は誰のためか",
      isMatched: false,
    },
  },
];

// 質問ドキュメント2
export const whyDocuments: Document[] = [
  {
    pageContent: "納期や期限を守るために早めの情報共有が必要",
    metadata: {
      id: "1",
      question_id: "2",
      question: "報連相はなぜリーダーのためなのか",
      isMatched: false,
    },
  },
  {
    pageContent:
      "機能の過不足がないように仕様のズレを防ぎ、適切な機能範囲を守る",
    metadata: {
      id: "2",
      question_id: "2",
      question: "報連相はなぜリーダーのためなのか",
      isMatched: false,
    },
  },
  {
    pageContent: "品質を保証しバグを未然に防ぐ",
    metadata: {
      id: "3",
      question_id: "2",
      question: "報連相はなぜリーダーのためなのか",
      isMatched: false,
    },
  },
];

// 状態保持用
export const defaultTransitionStates: HorensoStates = {
  isAnswerCorrect: false,
  hasQuestion: true,
  step: 0,
};
