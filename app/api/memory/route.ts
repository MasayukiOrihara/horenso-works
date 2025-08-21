import { RemoveMessage } from "@langchain/core/messages";
import {
  Annotation,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";

import { OpenAi4_1Mini } from "@/lib/llm/models";
import { MEMORY_SUMMARY_PROMPT, MEMORY_UPDATE_PROMPT } from "./contents";
import { SESSIONID_ERROR, UNKNOWN_ERROR } from "@/lib/message/messages";
import { convertToOpenAIFormat } from "./utils";

/** メッセージを挿入する処理 */
async function insartMessages(state: typeof GraphAnnotation.State) {
  const messages = state.messages;

  return { messages: messages };
}

/** メッセージをテキスト形式にフォーマットする処理 */
async function convertFormat(state: typeof GraphAnnotation.State) {
  // メッセージ取得
  const messages = state.messages;
  const formatted = state.formatted ?? [];

  // メッセージの選択
  const len = state.messages.length;
  const previousMessage = state.messages.slice(Math.max(0, len - 2), len);

  // message を整形
  for (const message of previousMessage) {
    const openaiFormat = convertToOpenAIFormat(message);
    const stringFormat = `${openaiFormat.role}: ${openaiFormat.content}`;
    const cleanFormat = stringFormat.replace(/[\r\n]+/g, "");
    formatted.push(cleanFormat);
  }

  // 要約したメッセージ除去
  const deleteMessages = messages
    .slice(0, -2)
    .map((m) => new RemoveMessage({ id: m.id! }));

  return { formatted: formatted, messages: deleteMessages };
}

/** 会話を行うか要約するかの判断処理 */
async function shouldContenue(state: typeof GraphAnnotation.State) {
  const formatted = state.formatted;

  if (formatted.length > 6) return "summarize";
  return "__end__";
}

/** 会話の要約処理 */
async function summarizeConversation(state: typeof GraphAnnotation.State) {
  const summary = state.summary;
  const formatted = state.formatted;

  let summaryMessage;

  if (summary) {
    summaryMessage = MEMORY_UPDATE_PROMPT.replace("{summary}", summary);
  } else {
    summaryMessage = MEMORY_SUMMARY_PROMPT;
  }

  // 要約処理
  const context = `${formatted.join("\n")}\n${summaryMessage}`;
  const response = await OpenAi4_1Mini.invoke(context);

  // 要約したメッセージ除去
  const empty: string[] = [];
  return { summary: response.content, formatted: empty };
}

/** 要約したメッセージを追加する処理 */
async function prepareMessages(state: typeof GraphAnnotation.State) {
  const formatted = state.formatted ?? [];

  const summary = state.summary;
  // 要約をシステムメッセージとして追加
  const systemMessage = `Previous conversation summary: ${summary}`;
  formatted.push(systemMessage);

  return { formatted: formatted };
}

// アノテーションの追加
const GraphAnnotation = Annotation.Root({
  summary: Annotation<string>(),
  formatted: Annotation<string[]>(),
  sessionId: Annotation<string>(),
  ...MessagesAnnotation.spec,
});

// グラフ
const workflow = new StateGraph(GraphAnnotation)
  // ノード追加
  .addNode("insart", insartMessages)
  .addNode("format", convertFormat)
  .addNode("prepare", prepareMessages)
  .addNode("summarize", summarizeConversation)

  // エッジ追加
  .addEdge("__start__", "insart")
  .addEdge("insart", "format")
  .addConditionalEdges("format", shouldContenue)
  .addEdge("summarize", "prepare")
  .addEdge("prepare", "__end__");

// 記憶の追加
const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

/**
 * 会話履歴要約API
 * オンメモリ版最悪の手段として一応の押しておく...?
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const sessionId = body.sessionId;
    if (!sessionId) {
      console.error("💿 memory API POST error: " + SESSIONID_ERROR);
      return Response.json({ error: SESSIONID_ERROR }, { status: 400 });
    }

    // 2行取得
    const len = messages.length;
    const previousMessage = messages.slice(Math.max(0, len - 2), len);

    // 履歴用キー
    const config = { configurable: { thread_id: sessionId } };
    const results = await app.invoke(
      { messages: previousMessage, sessionId: sessionId },
      config
    );

    return Response.json(results.formatted, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("💿 memory API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
