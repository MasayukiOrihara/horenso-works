import { RemoveMessage } from "@langchain/core/messages";
import {
  Annotation,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import fs from "fs";

import {
  MESSAGES_ERROR,
  SESSIONID_ERROR,
  UNKNOWN_ERROR,
} from "@/lib/message/error";
import { convertToOpenAIFormat, logShort } from "../../utils";
import { memoryFilePath, timestamp } from "@/lib/path";

/* 保存先を判断する */
async function decideSaveDestination() {
  // ※※ 現在 text 出力のみ、DB 使用時に分岐
  return "conText";
}

/** メッセージをテキスト形式にフォーマットする処理 */
async function convertTextFormat(state: typeof GraphAnnotation.State) {
  // メッセージを1つ取得
  const message = state.messages[state.messages.length - 1];
  const sessionId = state.sessionId;

  // message を整形
  const openaiFormat = convertToOpenAIFormat(message);
  const stringFormat = `${openaiFormat.role}: ${openaiFormat.content}`;
  const cleanFormat = stringFormat.replace(/[\r\n]+/g, "");

  // メタ情報の付与
  const sessionIdText = `sessionId: ${sessionId}`;
  const timestampText = `time: ${timestamp.slice(0, 16)}`;
  const result = `${cleanFormat} \n - ${sessionIdText}  ${timestampText} \n`;
  logShort("書き出す内容: \n" + result);

  return { textFormat: result };
}

/** メッセージを DB に保存するためにフォーマットする処理 */
async function convertDBFormat(state: typeof GraphAnnotation.State) {
  console.log("📩 db format");
  // メッセージを1つ取得
  const messages = state.messages[state.messages.length - 1];

  return {};
}

/* テキスト保存処理 */
async function saveTextData(state: typeof GraphAnnotation.State) {
  const textFormat = state.textFormat;
  const localPath = memoryFilePath;

  // ローカル保存
  fs.appendFileSync(localPath, textFormat, "utf-8");
  console.log(`✅ 会話内容を ${localPath} に保存しました。\n`);
}

/* DB保存処理 */
async function saveDBData() {}

/* 使ったメッセージを削除 */
async function deleteMessages(state: typeof GraphAnnotation.State) {
  const message = state.messages[state.messages.length - 1];

  // 使用したメッセージ除去
  const deleteMessage = new RemoveMessage({ id: message.id! });

  return { messages: deleteMessage };
}

// アノテーションの追加
const GraphAnnotation = Annotation.Root({
  summary: Annotation<string>(),
  sessionId: Annotation<string>(),
  textFormat: Annotation<string>(),
  ...MessagesAnnotation.spec,
});

// グラフ
const workflow = new StateGraph(GraphAnnotation)
  // ノード追加
  .addNode("conText", convertTextFormat)
  .addNode("saveText", saveTextData)
  .addNode("conDB", convertDBFormat)
  .addNode("saveDB", saveDBData)
  .addNode("delete", deleteMessages)

  // エッジ追加
  .addConditionalEdges("__start__", decideSaveDestination)
  .addEdge("conText", "saveText")
  .addEdge("conDB", "saveDB")
  .addEdge("saveText", "delete")
  .addEdge("saveDB", "delete")
  .addEdge("delete", "__end__");

// 記憶の追加
const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

/**
 * 会話履歴保存API
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // メッセージ取得
    const messages = body.messages;
    if (!messages) {
      console.error("💿 memory chat save API POST error: " + MESSAGES_ERROR);
      return Response.json({ error: MESSAGES_ERROR }, { status: 400 });
    }
    // 最新メッセージ取得
    const previousMessage = messages[messages.length - 1];

    // セッションID 取得
    const sessionId = body.sessionId;
    if (!sessionId) {
      console.error("💿 memory chat save API POST error: " + SESSIONID_ERROR);
      return Response.json({ error: SESSIONID_ERROR }, { status: 400 });
    }

    // 履歴用キー
    const config = { configurable: { thread_id: sessionId } };

    // 実行
    await app.invoke(
      { messages: previousMessage, sessionId: sessionId },
      config
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("💿 memory chat save API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
