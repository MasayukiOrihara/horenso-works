import { SessionFlags, SessionOptions } from "@/lib/type";
import { DEFAULT_SCORE } from "./threshold";

const DEFAULT_SESSION_OPTIONS: SessionOptions = {
  debugOn: false,
  memoryOn: true,
  questionnaireOn: false,
  aiValidateOn: { who: false, why: true },
  clueId: "",
  threshold: DEFAULT_SCORE,
};
export const DEFAULT_SESSION_FLAGS: SessionFlags = {
  sessionId: "",
  phase: "locked",
  sync: "idle",
  step: 0,
  options: DEFAULT_SESSION_OPTIONS,
};
