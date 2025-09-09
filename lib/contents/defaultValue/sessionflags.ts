import { SessionFlags, SessionOptions } from "@/lib/type";
import * as MTC from "@/lib/contents/match";

const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  debugOn: false,
  memoryOn: true,
  questionnaireOn: false,
  aiValidateOn: { who: false, why: true },
  clueId: "",
  threshold: {
    maxBase: MTC.BASE_MATCH_SCORE,
    minBase: MTC.BASE_WORST_SCORE,
    maxWrong: MTC.WRONG_MATCH_SCORE,
    maxFuzzy: MTC.FUZZY_MATCH_SCORE,
  },
};
export const DEFAULT_SESSION_FLAGS: SessionFlags = {
  sessionId: "",
  phase: "locked",
  sync: "idle",
  step: 0,
  options: DEFAULT_SESSION_OPTIONS,
};
