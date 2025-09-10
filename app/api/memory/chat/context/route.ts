import { RemoveMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  Annotation,
  MemorySaver,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";

import { strParser } from "@/lib/llm/models";
import { convertToOpenAIFormat } from "../../utils";
import { runWithFallback } from "@/lib/llm/run";
import { measureExecution } from "@/lib/llm/graph";
import * as MSG from "@/lib/contents/memory/template";
import * as ERR from "@/lib/message/error";

// 定数
const MAX_LENGTH = 6; // 要約をする最大行
const MAX_CHAR_LENGTH = 40; // 要約する最大文字数

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

  const sessionId = state.sessionId;

  // メッセージの選択
  const len = state.messages.length;
  const previousMessage = state.messages.slice(Math.max(0, len - 2), len);

  // message を整形
  for (const message of previousMessage) {
    const openaiFormat = convertToOpenAIFormat(message);

    // assistant メッセージは長いので毎回要約
    const role = openaiFormat.role;
    let content = openaiFormat.content;
    try {
      if (role === "assistant" && content.length > MAX_CHAR_LENGTH) {
        const prompt = PromptTemplate.fromTemplate(MSG.SUMMARY_PROMPT);
        const summary = await runWithFallback(
          prompt,
          { input: content },
          {
            mode: "invoke",
            parser: strParser,
            label: "assistant summary",
            sessionId: sessionId,
          }
        );
        content = summary.content;
      }
    } catch (error) {
      console.warn(`${ERR.SUMMARY_ERROR}: ${error} `);
    }
    const stringFormat = `${role}: ${content}`;
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

  if (formatted.length > MAX_LENGTH) return "summarize";
  return "__end__";
}

/** 会話の要約処理 */
async function summarizeConversation(state: typeof GraphAnnotation.State) {
  const summary = state.summary;
  const formatted = state.formatted;
  const formattedText = formatted.join("\n");
  const sessionId = state.sessionId;

  // 要約の有無によって分岐
  let summaryMessage = MSG.SUMMARY_PROMPT;
  type PromptVariables = {
    input: string;
    summary?: string;
  };
  let promptVariables: PromptVariables = { input: formattedText };
  if (summary) {
    summaryMessage = MSG.MEMORY_UPDATE_PROMPT;
    promptVariables = { input: formattedText, summary: summary };
  }

  // 要約処理
  let responseSummary = "";
  // 要約したメッセージ除去
  let empty: string[] = [];
  try {
    const prompt = PromptTemplate.fromTemplate(summaryMessage);
    const response = await runWithFallback(prompt, promptVariables, {
      mode: "invoke",
      parser: strParser,
      label: "memory summary",
      sessionId: sessionId,
    });
    responseSummary = response.content;
  } catch (error) {
    console.warn(`${ERR.SUMMARY_ERROR}: ${error}`);
    empty = [...formatted];
  }

  return { summary: responseSummary, formatted: empty };
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
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const sessionId = body.sessionId;
    if (!sessionId) {
      console.error("💿 memory API POST error: " + ERR.SESSIONID_ERROR);
      return Response.json({ error: ERR.SESSIONID_ERROR }, { status: 400 });
    }

    // 2行取得
    const len = messages.length;
    const previousMessage = messages.slice(Math.max(0, len - 2), len);

    // 履歴用キー
    const config = { configurable: { thread_id: sessionId } };

    // 実行
    const results = await measureExecution(
      app,
      "memory",
      { messages: previousMessage, sessionId },
      config
    );

    return Response.json(results.formatted, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("💿 memory API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
