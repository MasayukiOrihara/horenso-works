import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { Document } from "langchain/document";

import { ClueMetadata, Evaluation, HorensoStates } from "@/lib/type";

/** メイングラフ内の状態を司るアノテーション */
export const StateAnnotation = Annotation.Root({
  sessionId: Annotation<string>(),
  contexts: Annotation<string[]>(),
  qaEmbeddings: Annotation<[Document<ClueMetadata>, number][]>(),
  aiHint: Annotation<string>(),
  analyze: Annotation<string>(),
  evaluationData: Annotation<Evaluation[]>(),
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
