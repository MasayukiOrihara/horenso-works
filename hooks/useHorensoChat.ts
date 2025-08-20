import { ChatRequestOptions } from "@/lib/type";
import { useChat } from "@ai-sdk/react";

/**
 * 報連相ワークAI 使うためのフック
 */
export function useHorensoChat(
  apiPath: string,
  sessionId: string | null,
  options: ChatRequestOptions
) {
  return useChat({
    api: apiPath,
    body: { sessionId, options },
    onError: (error) => {
      console.log(error);
    },
  });
}
