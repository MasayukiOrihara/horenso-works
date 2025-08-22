import * as MSG from "./messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { LangChainAdapter } from "ai";

import { SESSIONID_ERROR, UNKNOWN_ERROR } from "@/lib/message/error";
import { ChatRequestOptionsSchema } from "@/lib/schema";
import { getBaseUrl } from "@/lib/path";
import { runWithFallback } from "@/lib/llm/run";
import { requestApi } from "@/lib/api/request";
import * as PATH from "@/lib/api/path";
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { updateEntry } from "./utils";

// 外部フラグ
let horensoContenue = false;
let oldHorensoContenue = false;

/**
 * 報連相ワークAI のレスポンスメッセージ作成API3
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { baseUrl } = getBaseUrl();
    // フロントから今までのメッセージを取得
    const messages = body.messages ?? [];
    // フロントからセッションID を取得
    const sessionId: string = body.sessionId;
    if (!sessionId) {
      console.error("💬 chat API POST error: " + SESSIONID_ERROR);
      return Response.json({ error: SESSIONID_ERROR }, { status: 400 });
    }
    // 過去の履歴取得（非同期）
    const memoryResponsePromise = requestApi(baseUrl, PATH.MEMORY_PATH, {
      method: "POST",
      body: { messages, sessionId },
    });
    // 直近のメッセージを取得
    const userMessage = messages[messages.length - 1].content;
    // フロントからオプションを取得
    const options = ChatRequestOptionsSchema.parse(body.options);
    // メッセージ保存: フロントエンドから記憶設定を取得
    const save = async (messages: BaseMessage[]) => {
      if (options.memoryOn) {
        await requestApi(baseUrl, PATH.CHAT_SAVE_PATH, {
          method: "POST",
          body: { messages, sessionId },
        });
      }
    };

    /* --- --- コンテキスト 処理 --- --- */
    // 始動時の状態判定
    const aiMessages = [];
    let qaEntryId = "";
    horensoContenue = true;
    if (horensoContenue && !oldHorensoContenue && !options.debug) {
      // 初回AIメッセージ
      console.log("🚪 初回のルート");
      oldHorensoContenue = true;

      // 開発の解説と問題を AIメッセージ に取り込み
      aiMessages.push(
        MSG.REPHRASE_WITH_LOGIC_PRESERVED.replace(
          "{sentence}",
          MSG.INTRO_TO_DEV_WORK
        )
      );
      aiMessages.push(MSG.QUESTION_WHO_ASKING);
    } else {
      await save(messages); // ユーザーメッセージ保存

      // 報連相ワークAPI呼び出し
      const step = options.debug ? options.step : 0; // デバック用のステップ数設定
      const horensoGraph = await requestApi(baseUrl, PATH.HORENSO_PATH, {
        method: "POST",
        body: { userMessage, sessionId, step },
      });
      aiMessages.push(horensoGraph.text);
      qaEntryId = horensoGraph.qaEntryId;

      // 終了時の状態判定
      console.log(
        "継続判定 api側: " +
          horensoGraph.contenue +
          " chat側: " +
          horensoContenue
      );
      if (horensoGraph.contenue != horensoContenue) {
        horensoContenue = false;
        aiMessages.push(MSG.FINISH_MESSAGE);
      }
    }

    /* --- --- LLM 処理 --- --- */
    // プロンプト読み込み
    const template = MSG.HORENSO_AI_KATO;
    const prompt = PromptTemplate.fromTemplate(template);

    // 過去履歴の同期
    const memoryResponse = await memoryResponsePromise;

    // プロンプト全文を取得して表示
    const promptVariables = {
      chat_history: memoryResponse,
      user_message: userMessage,
      ai_message: aiMessages.join("\n\n"),
    };

    // ストリーミング応答を取得
    const stream = await runWithFallback(prompt, promptVariables, {
      mode: "stream",
      onStreamEnd: async (response: string) => {
        // assistant メッセージ保存
        await save([new AIMessage(response)]);

        // 今回のエントリーにメッセージを追記 ※※ 後で細かくチェック
        console.log(qaEntryId);
        if (!(qaEntryId === "")) {
          updateEntry(qaEntryId, response);
        }
      },
    });

    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("💬 chat API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
