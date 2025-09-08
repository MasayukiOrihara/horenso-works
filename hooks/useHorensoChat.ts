import { useChat } from "@ai-sdk/react";
import { useErrorStore } from "@/hooks/useErrorStore";
import { toast } from "sonner";
import * as ERR from "@/lib/message/error";
import { SessionFlags } from "@/lib/type";

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
