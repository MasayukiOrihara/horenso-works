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
    pageContent: "納期や期限を守る",
    metadata: {
      id: "1",
      question_id: "2",
      question: "報連相はなぜリーダーのためなのか",
      isMatched: false,
    },
  },
  {
    pageContent: "機能に過不足がない",
    metadata: {
      id: "2",
      question_id: "2",
      question: "報連相はなぜリーダーのためなのか",
      isMatched: false,
    },
  },
  {
    pageContent: "品質が良く不具合がない",
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
