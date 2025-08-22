import { getBaseUrl } from "@/lib/path";
import { BaseMessage } from "@langchain/core/messages";

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
