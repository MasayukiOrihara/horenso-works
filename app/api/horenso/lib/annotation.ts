import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { Document } from "langchain/document";

import { HorensoStates, UserAnswerEvaluation } from "@/lib/type";

/** グラフ内の状態を司るアノテーション */
export const StateAnnotation = Annotation.Root({
  contexts: Annotation<string[]>(),
  matched: Annotation<boolean[]>(),
  qaEmbeddings: Annotation<[Document<Record<string, any>>, number][]>(),
  aiHint: Annotation<string>(),
  userAnswerData: Annotation<UserAnswerEvaluation[]>(),
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
