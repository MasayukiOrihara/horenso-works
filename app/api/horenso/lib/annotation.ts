import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

import { HorensoStates, UserAnswerEvaluation } from "@/lib/type";

/** グラフ内の状態を司るアノテーション */
export const StateAnnotation = Annotation.Root({
  contexts: Annotation<string[]>(),
  summary: Annotation<string>(),
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
  userAnswerData: Annotation<UserAnswerEvaluation[]>({
    value: (
      state: UserAnswerEvaluation[] = [],
      action: UserAnswerEvaluation[]
    ) => [...state, ...action],
    default: () => [],
  }),

  ...MessagesAnnotation.spec,
});
