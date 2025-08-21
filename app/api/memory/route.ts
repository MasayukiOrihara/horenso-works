import { RemoveMessage, SystemMessage } from "@langchain/core/messages";
import {
  Annotation,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";

import { OpenAi4_1Mini } from "@/lib/llm/models";
import { MEMORY_SUMMARY_PROMPT, MEMORY_UPDATE_PROMPT } from "./contents";
import { SESSIONID_ERROR, UNKNOWN_ERROR } from "@/lib/message/error";

// メッセージ履歴
const conversation: string[] = [];

/** メッセージを挿入する処理 */
async function insartMessages(state: typeof GraphAnnotation.State) {
  console.log("📩 insart messages");

  const messages = state.messages;
  return { messages: messages };
}

/** 要約したメッセージを追加する処理 */
async function prepareMessages(state: typeof GraphAnnotation.State) {
  console.log("📧 prepare messages");

  const summary = state.summary;
  // 要約をシステムメッセージとして追加
  const systemMessage = `Previous conversation summary: ${summary}`;
  const messages = [new SystemMessage(systemMessage)];

  return { messages: messages };
}

/** 会話を行うか要約するかの判断処理 */
async function shouldContenue(state: typeof GraphAnnotation.State) {
  console.log("❓ should contenue");
  const messages = state.messages;

  if (messages.length > 6) return "summarize";
  return "__end__";
}

/** 会話の要約処理 */
async function summarizeConversation(state: typeof GraphAnnotation.State) {
  console.log("📃 summarize conversation");
  const summary = state.summary;

  let summaryMessage;

  if (summary) {
    summaryMessage = MEMORY_UPDATE_PROMPT.replace("{summary}", summary);
  } else {
    summaryMessage = MEMORY_SUMMARY_PROMPT;
  }

  // 要約処理
  const messages = [...state.messages, new SystemMessage(summaryMessage)];
  const response = await OpenAi4_1Mini.invoke(messages);

  // 要約したメッセージ除去
  const deleteMessages = messages
    .slice(0, -2)
    .map((m) => new RemoveMessage({ id: m.id! }));
  return { summary: response.content, messages: deleteMessages };
}

// アノテーションの追加
const GraphAnnotation = Annotation.Root({
  summary: Annotation<string>(),
  sessionId: Annotation<string>(),
  ...MessagesAnnotation.spec,
});

// グラフ
const workflow = new StateGraph(GraphAnnotation)
  // ノード追加
  .addNode("insart", insartMessages)
  .addNode("prepare", prepareMessages)
  .addNode("summarize", summarizeConversation)

  // エッジ追加
  .addEdge("__start__", "insart")
  .addConditionalEdges("insart", shouldContenue)
  .addEdge("summarize", "prepare")
  .addEdge("prepare", "__end__");

// 記憶の追加
const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

/**
 * 会話履歴要約API
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

    // 履歴メッセージの加工
    conversation.length = 0; // 初期化
    for (const message of results.messages) {
      const content = String(message.content).replace(/\r?\n/g, "");

      switch (message.getType()) {
        case "human":
          conversation.push(`user: ${content}`);
          break;
        case "ai":
          conversation.push(`assistant: ${content}`);
          break;
        default:
          conversation.push(`${content}`);
      }
    }

    return Response.json(conversation, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("💿 memory API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * 会話履歴要約API
 * @param req
 * @returns
 */
export async function GET() {
  try {
    // 既存の会話履歴を返す
    return new Response(JSON.stringify(conversation), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
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
