import { getBaseUrl } from "@/lib/path";
import { BaseMessage } from "@langchain/core/messages";

/* 報連相ワークAPI */
export const postHorensoGraphApi = async (
  step: number,
  userMessage: string
) => {
  const { baseUrl } = getBaseUrl();

  const response = await fetch(baseUrl + "/api/horenso", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`, // vercel用
    },
    body: JSON.stringify({ step, userMessage }),
  });

  return response;
};

/* 過去会話履歴API */
export const postMemoryApi = async (messages: BaseMessage[]) => {
  const { baseUrl } = getBaseUrl();

  const response = await fetch(baseUrl + "/api/memory", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`, // vercel用
    },
    body: JSON.stringify({ messages }),
  });

  return response;
};

/* 過去会話履歴API */
export const getMemoryApi = async () => {
  const { baseUrl } = getBaseUrl();

  const response = await fetch(baseUrl + "/api/memory", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`, // vercel用
    },
  });

  return response;
};

/* 回答チェックの判定API */
export const getShouldValidateApi = async () => {
  const { baseUrl } = getBaseUrl();

  const response = await fetch(baseUrl + "/api/horenso/lib/match/validate", {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`, // vercel用
    },
  });

  return response.json();
};
