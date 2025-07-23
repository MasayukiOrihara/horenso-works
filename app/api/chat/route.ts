import { LangSmithClient } from "@/lib/clients";
import * as MESSAGES from "@/lib/messages";
import {
  fake,
  haiku3_5_sentence,
  OpenAi4_1Mini,
  OpenAi4oMini,
  strParser,
} from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";
import { LangChainAdapter } from "ai";

import { logLearn, logMessage, readAddPrompt, updateEntry } from "./utils";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { POINT_OUT_LOG } from "@/lib/messages";
import { getBaseUrl } from "@/lib/path";
import { postHorensoGraphApi, postMemoryApi } from "../../../lib/api/serverApi";
import {
  FOR_REPORT_COMMUNICATION,
  REPORT_REASON_FOR_LEADER,
  THREE_ANSWER,
} from "../horenso/contents/messages";

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
    const { baseUrl } = getBaseUrl(req);
    console.log(baseUrl);
    const getBoolHeader = (key: string) => req.headers.get(key) === "true";

    // 過去の履歴
    const memoryResponsePromise = postMemoryApi(messages);
    // 直近のメッセージを取得
    const userMessage = messages[messages.length - 1].content;

    if (horensoContenue) {
      // メッセージ保存: フロントエンドから記憶設定を取得
      const humanMessage = new HumanMessage(userMessage);
      if (getBoolHeader("memoryOn")) {
        await logMessage(humanMessage);
      }
    }

    // 指摘の取得: フロントエンドから指摘設定を取得
    if (getBoolHeader("learnOn")) {
      const log = await logLearn(userMessage);
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

      console.log("🏁 始めの会話");
      // ※※ 加藤さんから初めの会話例をもらったので、それをベースに作成していく
      aiMessage =
        MESSAGES.DEVELOPMENT_WORK_EXPLANATION + MESSAGES.QUESTION_WHO_ASKING;
    } else {
      // 報連相ワークAPI呼び出し
      const horensoGraph = await postHorensoGraphApi(step, userMessage);
      const apiBody = await horensoGraph.json();
      aiMessage = apiBody.text;
      qaEntryId = apiBody.qaEntryId;

      // 終了時の状態判定
      console.log(
        "継続判定 api側: " + apiBody.contenue + " chat側: " + horensoContenue
      );
      if (apiBody.contenue != horensoContenue) {
        horensoContenue = false;
        // ※※ 加藤さんから閉めの会話例をもらうので、それをベースに作成していく
        // ※※ 現行のシステムだとグラフ内で終わりのプロンプトを導き出してるが、どうするかはあとで決める
        aiMessage = aiMessage + "\n\n" + MESSAGES.FINISH_MESSAGE;
      }
    }

    // 過去履歴の同期
    const memoryResponse = await memoryResponsePromise;
    const memoryData = await memoryResponse.json();

    // プロンプト全文を取得して表示
    const promptVariables = {
      chat_history: memoryData,
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
    const stream = await prompt.pipe(OpenAi4oMini).stream({
      chat_history: memoryData,
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
          await logMessage(aiMessage);
        }

        // 今回のエントリーにメッセージを追記
        if (!(qaEntryId === "")) {
          updateEntry(qaEntryId, fullText);
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
