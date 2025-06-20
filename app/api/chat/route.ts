import { LangSmithClient } from "@/lib/clients";
import * as MESSAGES from "@/lib/messages";
import { OpenAi } from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";
import { LangChainAdapter } from "ai";

import { formatMessage, getBaseUrl, logMessage } from "./utils";
import {
  AIMessage,
  BaseMessage,
  ChatMessage,
  HumanMessage,
} from "@langchain/core/messages";

// 外部フラグ
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
    const { host, baseUrl } = getBaseUrl(req);
    const getBoolHeader = (key: string) => req.headers.get(key) === "true";

    let step = "0";

    // 過去の履歴
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    // 直近のメッセージを取得
    const userMessage = messages[messages.length - 1].content;

    // メッセージ保存: フロントエンドから記憶設定を取得
    const humanMessage = new HumanMessage(userMessage);
    if (getBoolHeader("memoryOn")) {
      await logMessage(host, humanMessage);
    }

    // 指摘の取得: フロントエンドから指摘設定を取得
    // ※※※ たぶんまだ動きません
    if (getBoolHeader("learnOn")) {
      await logMessage(host, userMessage);
    }

    // デバック: 初回メッセージのスキップ
    if (getBoolHeader("debug")) {
      console.log("デバッグモードで作動中...");
      step = req.headers.get("step") ?? "0";
    }

    // 始動時の状態判定
    let aiMessage = "";
    horensoContenue = true;
    if (horensoContenue && !oldHorensoContenue && !getBoolHeader("debug")) {
      // 初回AIメッセージ
      oldHorensoContenue = true;

      aiMessage =
        MESSAGES.DEVELOPMENT_WORK_EXPLANATION + MESSAGES.QUESTION_WHO_ASKING;
      console.log("🏁 始めの会話");
    } else {
      // 報連相ワークAPI呼び出し
      const res = await fetch(baseUrl + "/api/horenso", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          step: step,
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
        aiMessage = aiMessage + "\n\n" + MESSAGES.FINISH_MESSAGE;
      }
    }

    // プロンプト全文を取得して表示
    const promptVariables = {
      chat_history: formattedPreviousMessages,
      user_message: userMessage,
      ai_message: aiMessage,
    };

    // プロンプト読み込み
    const load = await LangSmithClient.pullPromptCommit("horenso_ai-kato");
    const template = load.manifest.kwargs.template;
    const prompt = PromptTemplate.fromTemplate(template);

    // ストリーミング応答を取得
    const stream = await prompt.pipe(OpenAi).stream({
      chat_history: formattedPreviousMessages,
      user_message: userMessage,
      ai_message: aiMessage,
    });

    const fullPrompt = await prompt.format(promptVariables);
    console.log("=== 送信するプロンプト全文 ===");
    console.log(fullPrompt);
    console.log("================================");

    // ReadableStream を拡張して終了検知
    const enhancedStream = new ReadableStream({
      async start(controller) {
        let fullText = "";

        for await (const chunk of stream) {
          fullText += chunk.content || "";

          // ストリームにはそのまま流す
          controller.enqueue(chunk);
        }
        console.log("ストリーミング終了");

        // メッセージ保存: フロントエンドから記憶設定を取得
        const aiMessage = new AIMessage(fullText);
        if (getBoolHeader("memoryOn")) {
          await logMessage(host, aiMessage);
        }
        controller.close();
      },
    });

    return LangChainAdapter.toDataStreamResponse(enhancedStream);
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
