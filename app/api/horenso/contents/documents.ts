import { Document } from "langchain/document";

import { HorensoMetadata, HorensoStates } from "@/lib/type";
import {
  FOR_REPORT_COMMUNICATION,
  REPORT_REASON_FOR_LEADER,
  THREE_ANSWER,
} from "./messages";

// 質問ドキュメント1
export const whoDocuments: Document<HorensoMetadata>[] = [
  {
    pageContent: "リーダー",
    metadata: {
      parentId: "1",
      question_id: "1",
      question: FOR_REPORT_COMMUNICATION,
      isMatched: false,
    },
  },
];

// 質問ドキュメント2: 「納期」「仕様」「品質」
export const whyDocuments: Document<HorensoMetadata>[] = [
  {
    pageContent: "納期や期限を守るために早めの情報共有が必要",
    metadata: {
      parentId: "1",
      question_id: "2",
      question: REPORT_REASON_FOR_LEADER + THREE_ANSWER,
      isMatched: false,
    },
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
  },
  {
    pageContent: "品質を保証しバグを未然に防ぐ",
    metadata: {
      parentId: "3",
      question_id: "2",
      question: REPORT_REASON_FOR_LEADER + THREE_ANSWER,
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
