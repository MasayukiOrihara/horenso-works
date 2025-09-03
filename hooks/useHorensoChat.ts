import { ChatRequestOptions } from "@/lib/schema";
import { useChat } from "@ai-sdk/react";
import { useErrorStore } from "@/hooks/useErrorStore";
import { toast } from "sonner";
import * as ERR from "@/lib/message/error";
import { useClueId } from "./useClueId";
import { Session } from "@/lib/type";

/**
 * 報連相ワークAI 使うためのフック
 */
export function useHorensoChat(
  apiPath: string,
  session: Session | null,
  options: ChatRequestOptions
) {
  const { push } = useErrorStore();
  const { setClueId } = useClueId();

  return useChat({
    api: apiPath,
    body: { session, options },
    onResponse: (res) => {
      const id = res.headers.get("x-clue-id");
      setClueId(id);
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
