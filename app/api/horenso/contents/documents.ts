import { HorensoStates } from "@/lib/type";
import { Document } from "langchain/document";
import {
  FOR_REPORT_COMMUNICATION,
  REPORT_REASON_FOR_LEADER,
  THREE_ANSWER,
} from "./messages";

// 質問ドキュメント1
export const whoDocuments: Document[] = [
  {
    pageContent: "リーダー",
    metadata: {
      parentId: "1",
      question_id: "1",
      question: FOR_REPORT_COMMUNICATION,
      isMatched: false,
    },
    id: "1-1",
  },
];

// 質問ドキュメント2: 「納期」「仕様」「品質」
export const whyDocuments: Document[] = [
  {
    pageContent: "納期や期限を守るために早めの情報共有が必要",
    metadata: {
      parentId: "1",
      question_id: "2",
      question: REPORT_REASON_FOR_LEADER + THREE_ANSWER,
      isMatched: false,
    },
    id: "1-1",
  },
  {
    pageContent:
      "機能の過不足がないように仕様のズレを防ぎ、適切な機能範囲を守る",
    metadata: {
      parentId: "2",
      question_id: "2",
      question: REPORT_REASON_FOR_LEADER + THREE_ANSWER,
      isMatched: false,
    },
    id: "2-1",
  },
  {
    pageContent: "品質を保証しバグを未然に防ぐ",
    metadata: {
      parentId: "3",
      question_id: "2",
      question: REPORT_REASON_FOR_LEADER + THREE_ANSWER,
      isMatched: false,
    },
    id: "3-1",
  },
];

// 状態保持用
export const defaultTransitionStates: HorensoStates = {
  isAnswerCorrect: false,
  hasQuestion: true,
  step: 0,
};
