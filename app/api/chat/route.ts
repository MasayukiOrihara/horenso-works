import { LangSmithClient } from "@/lib/clients";
import * as MESSAGES from "@/lib/messages";
import { fake, OpenAi } from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";
import { LangChainAdapter } from "ai";
import fs from "fs";

import {
  formatMessage,
  logLearn,
  logMessage,
  readAddPrompt,
  readJson,
} from "./utils";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { QAEntry } from "@/lib/type";
import { POINT_OUT_LOG } from "@/lib/messages";
import { getBaseUrl, qaEntriesFilePath } from "@/lib/path";

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

    // 過去の履歴
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    // 直近のメッセージを取得
    const userMessage = messages[messages.length - 1].content;

    if (horensoContenue) {
      // メッセージ保存: フロントエンドから記憶設定を取得
      const humanMessage = new HumanMessage(userMessage);
      if (getBoolHeader("memoryOn")) {
        await logMessage(host, humanMessage);
      }
    }

    // 指摘の取得: フロントエンドから指摘設定を取得
    if (getBoolHeader("learnOn")) {
      const log = await logLearn(host, userMessage);
      console.log("指摘終了\n");

      // 定型文を吐いて会話を抜ける
      const outputText = `${POINT_OUT_LOG}\n${log}\n\nブラウザを再読み込みしてください。`;
      return LangChainAdapter.toDataStreamResponse(await fake(outputText));
    }

    // デバック: 初回メッセージのスキップ
    let step = "0";
    if (getBoolHeader("debug")) {
      console.log("デバッグモードで作動中...");
      step = req.headers.get("step") ?? "0";
    }

    // 始動時の状態判定
    let aiMessage = "";
    let qaEntryId = "";
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
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`, // vercel用
          step: step,
        },
        body: JSON.stringify({ messages }),
      });
      const apiBody = await res.json();
      aiMessage = apiBody.text;
      qaEntryId = apiBody.qaEntryId;

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

    // 追加プロンプトの読み込み
    let add = "";
    if (getBoolHeader("addPromptOn")) {
      add = await readAddPrompt();
      console.log("追加プロンプト: \n" + add);

      add = "\n\n" + add; // 整形
    }

    // プロンプト読み込み
    const load = await LangSmithClient.pullPromptCommit("horenso_ai-kato");
    const template = load.manifest.kwargs.template + add;
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
        console.log("ストリーミング終了\n");

        // メッセージ保存: フロントエンドから記憶設定を取得
        const aiMessage = new AIMessage(fullText);
        if (getBoolHeader("memoryOn")) {
          await logMessage(host, aiMessage);
        }

        // 今回のエントリーにメッセージを追記
        if (!(qaEntryId === "")) {
          // 既存データを読み込む（なければ空配列）
          const qaList: QAEntry[] = readJson(qaEntriesFilePath(host));

          // 値の更新
          const updated = qaList.map((qa) =>
            qa.id === qaEntryId && qa.hint === ""
              ? {
                  ...qa,
                  hint: fullText,
                  metadata: {
                    ...qa.metadata,
                  },
                }
              : qa
          );
          // 上書き保存（整形付き）
          fs.writeFileSync(
            qaEntriesFilePath(host),
            JSON.stringify(updated, null, 2)
          );
          console.log(
            `✅ エントリーデータを ${qaEntriesFilePath(host)} に更新しました`
          );
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
