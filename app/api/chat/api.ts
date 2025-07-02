import { BaseMessage } from "@langchain/core/messages";

/* 報連相ワークAPI */
export const horensoApi = async (
  url: string,
  step: string,
  userMessage: string
) => {
  const response = await fetch(url + "/api/horenso", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`, // vercel用
      step: step,
    },
    body: JSON.stringify({ userMessage }),
  });

  return response;
};

/* 過去会話履歴API */
export const memoryApi = async (url: string, messages: BaseMessage[]) => {
  const response = await fetch(url + "/api/memory", {
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
