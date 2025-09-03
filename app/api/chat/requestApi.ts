import { BaseMessage } from "@langchain/core/messages";
import { requestApi } from "@/lib/api/request";
import * as PATH from "@/lib/api/path";

// それぞれのリクエスト
// 記憶の取り出し
export const requestMemory = async (
  url: string,
  messages: BaseMessage[],
  sessionId: string
) => {
  return await requestApi(url, PATH.MEMORY_PATH, {
    method: "POST",
    body: { messages, sessionId },
  });
};

// プロファイルの取り出し
export const requestUserprofile = async (url: string, sessionId: string) => {
  return await requestApi(url, `${PATH.USERPROFILE_LOAD_PATH}${sessionId}`, {
    method: "GET",
  });
};

// 記憶の保存
export const requestSave = async (
  url: string,
  messages: BaseMessage[],
  sessionId: string
) => {
  return await requestApi(url, PATH.CHAT_SAVE_PATH, {
    method: "POST",
    body: { messages, sessionId },
  });
};

// 報連相ワークの実行
export const requestHorensoGraph = async (
  url: string,
  userMessage: string,
  sessionId: string,
  step: number
) => {
  return await requestApi(url, PATH.HORENSO_PATH, {
    method: "POST",
    body: { userMessage, sessionId, step },
  });
};
