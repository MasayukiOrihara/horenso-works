import { useChat } from "@ai-sdk/react";
import { useErrorStore } from "@/hooks/useErrorStore";
import { toast } from "sonner";
import * as ERR from "@/lib/message/error";
import { useSessionFlagsStorage } from "./useSessionStorage";
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
  state: "locked",
  step: 0,
  options: DEFAULT_SESSION_OPTIONS,
};

function decodeBase64Json<T>(b64: string): T | null {
  try {
    return JSON.parse(atob(b64)) as T;
  } catch {
    return null;
  }
}

type UseHorensoChatOptions = {
  onFlags?: (flags: SessionFlags) => void;
};

/**
 * 報連相ワークAI 使うためのフック
 */
export function useHorensoChat(
  apiPath: string,
  sessionId: string | null,
  { onFlags }: UseHorensoChatOptions = {}
) {
  const { push } = useErrorStore();

  return useChat({
    api: apiPath,
    body: { sessionId },
    onResponse: (res) => {
      // ヘッダーでフラグのやり取りをする
      const b64 = res.headers.get("x-send-flags");
      if (!b64) return;
      const json = decodeBase64Json<SessionFlags>(b64);
      if (json) onFlags?.(json);
    },
    onError: (error) => {
      toast.error(`${ERR.FATAL_ERROR}\n${ERR.RELOAD_BROWSER}`);

      const message =
        error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
      const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
      push({ message: ERR.USERPROFILE_SEND_ERROR, detail: stack || message });
    },
  });
}
