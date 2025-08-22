import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { Document } from "langchain/document";

import {
  HorensoStates,
  QADocumentMetadata,
  UserAnswerEvaluation,
} from "@/lib/type";

/** グラフ内の状態を司るアノテーション */
export const StateAnnotation = Annotation.Root({
  sessionId: Annotation<string>(),
  contexts: Annotation<string[]>(),
  matched: Annotation<boolean[]>(),
  qaEmbeddings: Annotation<[Document<QADocumentMetadata>, number][]>(),
  aiHint: Annotation<string>(),
  talkJudge: Annotation<string>(),
  userAnswerDatas: Annotation<UserAnswerEvaluation[]>(),
  transition: Annotation<HorensoStates>({
    value: (
      state: HorensoStates = {
        isAnswerCorrect: false,
        hasQuestion: true,
        step: 0,
      },
      action: Partial<HorensoStates>
    ) => ({
      ...state,
      ...action,
    }),
  }),

  ...MessagesAnnotation.spec,
});
