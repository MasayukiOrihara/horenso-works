import axios from "axios";
import * as ERR from "../message/error";

// 型
type RequestBody = Record<string, unknown>;
type HttpMethod = "GET" | "POST" | "DELETE";
type RequestOptions = {
  method?: HttpMethod;
  body?: RequestBody;
  maxRetries?: number;
  baseDelay?: number;
};

// api 共通関数
export const requestApi = async (
  baseUrl: string,
  path: string,
  {
    method = "GET",
    body,
    maxRetries = 3,
    baseDelay = 200, // ミリ秒
  }: RequestOptions = {}
) => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.request({
        url: baseUrl + path,
        method,
        data: method === "POST" ? body : undefined,
        withCredentials: true,
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      return response.data; // axiosはレスポンスデータがここに入る
    } catch (error) {
      const message =
        error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

      let isRetryable = true;
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        isRetryable =
          !status || // ネットワーク系 (タイムアウトなど)
          (status >= 500 && status < 600); // サーバーエラー
      }

      if (attempt === maxRetries || !isRetryable) {
        throw new Error(ERR.RECUEST_ERROR + message);
      }

      const delay = Math.min(baseDelay * 2 ** attempt, 5000); // 最大5秒
      const jitter = Math.random() * 100;

      console.warn(
        `API失敗 (試行${attempt + 1}/${maxRetries})。${
          delay + jitter
        }ms 待機してリトライ...`
      );
      await new Promise((res) => setTimeout(res, delay + jitter));
    }
  }
  throw new Error(ERR.RETRY_ERROR);
};
