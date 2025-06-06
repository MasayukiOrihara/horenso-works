import { LangSmithClient } from "@/lib/clients";
import {
  DEVELOPMENT_WORK_EXPLANATION,
  FINISH_MESSAGE,
  QUESTION_WHO_ASKING,
} from "@/lib/messages";
import { OpenAi } from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";
import { Message as VercelChatMessage, LangChainAdapter } from "ai";
import fs from "fs";
import path from "path";

// 外部フラグ
let horensoContenue = false;
let oldHorensoContenue = false;

// テキスト保存先
const timestamp = new Date().toISOString();
const named = timestamp.slice(0, 10);
const fileName = `memory-${named}.txt`;
const filePath = path.join(process.cwd(), "memory", fileName);

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

    /* これまでの会話を記憶(前回ターンで返ってきたai返答と今回ターンのuser解答を追記) */
    const onMemory = req.headers.get("memoryOn") === "true";
    console.log("chat側記憶設定: " + onMemory);
    if (onMemory) {
      console.log("会話を記憶中...");

      // テキストの整形
      const formatted = messages.slice(-2).map(formatMessage);
      const cleaned = formatted.map((str: string) =>
        str.replace(/[\r\n]+/g, "")
      );
      const result =
        cleaned.join("\n") + "\n - " + timestamp.slice(0, 16) + "\n";

      // ファイル書き出し
      fs.appendFileSync(filePath, result, "utf-8");
      console.log(`✅ 会話内容を ${fileName} に保存しました。`);
    }

    // 始動時の状態判定
    let aiMessage = "";
    horensoContenue = true;
    if (horensoContenue && !oldHorensoContenue) {
      oldHorensoContenue = true;

      aiMessage = DEVELOPMENT_WORK_EXPLANATION + QUESTION_WHO_ASKING;
      console.log("始めの会話");
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
      console.log("継続判定 api側: " + apiBody.contenue);
      console.log("継続判定 chat側: " + horensoContenue);
      if (apiBody.contenue != horensoContenue) {
        horensoContenue = false;
        aiMessage = aiMessage + "\n\n" + FINISH_MESSAGE;
      }
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

    console.log("chat ai_message: " + aiMessage);

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
