import { haiku3_5_sentence, openAi4oMini } from "@/lib/models";
import { RemoveMessage, SystemMessage } from "@langchain/core/messages";
import {
  Annotation,
  END,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";

/** 会話を行うか要約するかの判断処理 */
async function shouldContenue(state: typeof GraphAnnotation.State) {
  console.log("❓ should contenue");
  const messages = state.messages;

  if (messages.length > 3) return "summarize";
  return END;
}

/** 会話の要約処理 */
async function summarizeConversation(state: typeof GraphAnnotation.State) {
  console.log("📃 summarize conversation");
  const summary = state.summary;

  let summaryMessage;
  if (summary) {
    summaryMessage = `Conversation summary so far: ${summary}\n\n上記の新しいメッセージを考慮して要約を拡張してください。: `;
  } else {
    summaryMessage =
      "上記の入力を過去の会話の記憶として保持できるように重要な意図や情報・流れがわかるように短く要約してください。: ";
  }

  // 要約処理
  const messages = [...state.messages, new SystemMessage(summaryMessage)];
  const response = await openAi4oMini.invoke(messages);
  console.log(response.content);

  const deleteMessages = messages
    .slice(0, -2)
    .map((m) => new RemoveMessage({ id: m.id! }));
  return { summary: response.content, messages: deleteMessages };
}

// アノテーションの追加
const GraphAnnotation = Annotation.Root({
  summary: Annotation<string>(),
  ...MessagesAnnotation.spec,
});

// グラフ
const workflow = new StateGraph(GraphAnnotation)
  // ノード追加
  .addNode("summarize", summarizeConversation)

  // エッジ追加
  .addConditionalEdges("__start__", shouldContenue)
  .addEdge("summarize", END);

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
    const currentMessage = messages[messages.length - 1].content;

    const config = { configurable: { thread_id: "abc123" } };
    const results = await app.invoke({ messages: currentMessage }, config);

    const conversation = [];
    for (let message of results.messages) {
      const typeId = message?.id?.[2]; // ['langchain_core', 'messages', 'HumanMessage'] の3つ目

      if (typeId === "HumanMessage")
        conversation.push(`user: ${message.content}`);
      if (typeId === "AIMessage")
        conversation.push(`assistant: ${message.content}`);

      conversation.push(`system: ${message.content}`);
    }

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
