import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

import { HorensoStates, UserAnswerEvaluation } from "@/lib/type";

/** グラフ内の状態を司るアノテーション */
export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  contexts: Annotation<string>({
    value: (state: string = "", action: string) => state + action,
    default: () => "",
  }),
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
    value: (a, b) => [...a, ...b],
  }),
});
