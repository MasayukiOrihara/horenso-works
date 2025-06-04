import { LangSmithClient } from "@/lib/clients";
import {
  DEVELOPMENT_WORK_EXPLANATION,
  FINISH_MESSAGE,
  QUESTION_WHO_ASKING,
} from "@/lib/messages";
import { OpenAi } from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";
import { Message as VercelChatMessage, LangChainAdapter } from "ai";

let horensoContenue = false;
let oldHorensoContenue = false;

/**
 * 報連相ワークAI
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];

    // 過去の履歴
    const formatMessage = (message: VercelChatMessage) => {
      return `${message.role}: ${message.content}`;
    };
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    // 直近のメッセージを取得
    const userMessage = messages[messages.length - 1].content;

    // 始動時の状態判定
    let aiMessage = "";
    horensoContenue = true;
    if (horensoContenue && !oldHorensoContenue) {
      oldHorensoContenue = true;

      aiMessage = DEVELOPMENT_WORK_EXPLANATION + QUESTION_WHO_ASKING;
    } else {
      // 報連相ワークAPI呼び出し
      const host = req.headers.get("host");
      const protocol = host?.includes("localhost") ? "http" : "https";
      const baseUrl = `${protocol}://${host}`;

      const res = await fetch(baseUrl + "/api/horenso", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ messages }),
      });
      const apiBody = await res.json();
      aiMessage = apiBody.text;

      // 終了時の状態判定
      console.log("chat.tsx: " + apiBody.text);
      console.log("api側: " + apiBody.contenue);
      if (apiBody.contenue != horensoContenue) {
        horensoContenue = false;
      }
      console.log("chat側: " + horensoContenue);
      aiMessage = FINISH_MESSAGE;
    }

    // プロンプト読み込み
    const template = await LangSmithClient.pullPromptCommit("horenso_ai-kato");
    const prompt = PromptTemplate.fromTemplate(
      template.manifest.kwargs.template
    );

    // ストリーミング応答を取得
    const stream = await prompt.pipe(OpenAi).stream({
      chat_history: formattedPreviousMessages,
      user_message: userMessage,
      ai_message: aiMessage,
    });

    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
