import { BaseMessage, RemoveMessage } from "@langchain/core/messages";
import {
  Annotation,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

import { convertToOpenAIFormat, saveSupabase } from "../../utils";
import { measureExecution } from "@/lib/llm/graph";

import * as ERR from "@/lib/message/error";
import { MemoryTextData } from "@/lib/type";
import { toJSTISOString } from "@/lib/utils";

/** メッセージをテキスト形式にフォーマットする処理 */
async function convertTextFormat(state: typeof GraphAnnotation.State) {
  // メッセージを1つ取得
  const message = state.messages[state.messages.length - 1];
  const sessionId = state.sessionId;

  // message を整形
  const openaiFormat = convertToOpenAIFormat(message);

  // メタ情報の付与してオブジェクト作成
  const memoryTextData: MemoryTextData = {
    id: uuidv4(),
    role: openaiFormat.role,
    content: openaiFormat.content,
    sessionId: sessionId,
    createdAt: toJSTISOString().slice(0, 16),
  };

  return { memoryTextData: memoryTextData };
}

/* 保存先を判断する */
async function decideSaveDestination() {
  // .envで切り替え
  if (process.env.STORAGE_TYPE === "db") {
    return "saveDB";
  }

  return "saveText";
}

/* テキスト保存処理 */
async function saveTextData(state: typeof GraphAnnotation.State) {
  const memoryTextData = state.memoryTextData;

  // 保存先
  const named = toJSTISOString().slice(0, 10);
  const memoryFileName = `memory-${named}.txt`;
  const localPath = path.join(
    process.cwd(),
    "public",
    "memory",
    memoryFileName
  );

  // 形式を整える
  const message = `${memoryTextData.role}: ${memoryTextData.content}`;
  const textFormat = `${message}\n - sessionId: ${memoryTextData.sessionId}  time: ${memoryTextData.createdAt}`;

  // ローカル保存
  fs.appendFileSync(localPath, textFormat, "utf-8");
  console.log(`✅ 会話内容を ${localPath} に保存しました。\n`);
}

/* DB保存処理 */
async function saveDBData(state: typeof GraphAnnotation.State) {
  const memoryTextData = state.memoryTextData;

  try {
    await saveSupabase(memoryTextData);
    console.log(`✅ 会話内容を データベース に保存しました。\n`);
  } catch (error) {
    console.error("✖ 会話内容が データベース に保存できませんでした: " + error);
  }
}

/* 使ったメッセージを削除 */
async function deleteMessages(state: typeof GraphAnnotation.State) {
  const message = state.messages[state.messages.length - 1];

  // 使用したメッセージ除去
  const deleteMessage = new RemoveMessage({ id: message.id! });

  return { messages: deleteMessage };
}

// アノテーションの追加
const GraphAnnotation = Annotation.Root({
  sessionId: Annotation<string>(),
  memoryTextData: Annotation<MemoryTextData>(),

  ...MessagesAnnotation.spec,
});

// グラフ
const workflow = new StateGraph(GraphAnnotation)
  // ノード追加
  .addNode("conText", convertTextFormat)
  .addNode("saveText", saveTextData)
  .addNode("saveDB", saveDBData)
  .addNode("delete", deleteMessages)

  // エッジ追加
  .addEdge("__start__", "conText")
  .addConditionalEdges("conText", decideSaveDestination)
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
    const message: BaseMessage = body.message;
    if (!message) {
      console.error(
        "💿 memory chat save API POST error: " + ERR.MESSAGES_ERROR
      );
      return Response.json({ error: ERR.MESSAGES_ERROR }, { status: 400 });
    }

    // セッションID 取得
    const sessionId = body.sessionId;
    if (!sessionId) {
      console.error(
        "💿 memory chat save API POST error: " + ERR.SESSIONID_ERROR
      );
      return Response.json({ error: ERR.SESSIONID_ERROR }, { status: 400 });
    }

    // 履歴用キー
    const config = { configurable: { thread_id: sessionId } };

    // 実行
    await measureExecution(
      app,
      "memory save",
      { messages: message, sessionId },
      config
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("💿 memory chat save API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
