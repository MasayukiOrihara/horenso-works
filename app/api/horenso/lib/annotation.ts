import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { Document } from "langchain/document";

import { HorensoStates, QADocumentMetadata } from "@/lib/type";
import { Evaluation } from "./match/route";

/** メイングラフ内の状態を司るアノテーション */
export const StateAnnotation = Annotation.Root({
  sessionId: Annotation<string>(),
  contexts: Annotation<string[]>(),
  qaEmbeddings: Annotation<[Document<QADocumentMetadata>, number][]>(),
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
