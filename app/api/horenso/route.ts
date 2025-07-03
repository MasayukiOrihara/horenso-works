import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { MemorySaver, StateGraph } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { Document } from "langchain/document";
import fs from "fs";

import {
  HorensoStates,
  QAEntry,
  QAMetadata,
  UsedEntry,
  UserAnswerEvaluation,
} from "@/lib/type";
import * as MSG from "./contents/messages";
import * as DOC from "./contents/documents";
import { StateAnnotation } from "./lib/annotation";
import { findMatchStatusChanges, matchAnswerOpenAi } from "./lib/match";
import * as Utils from "./lib/utils";
import { embeddings, OpenAi, openAi4oMini } from "../../../lib/models";
import { getBaseUrl, qaEntriesFilePath, timestamp } from "@/lib/path";
import { PromptTemplate } from "@langchain/core/prompts";
import { setupInitialNode } from "./node/setupInitialNode";
import { preprocessAiNode } from "./node/preprocessAINode";
import { checkUserAnswerNode } from "./node/checkUserAnswerNode";
import { rerankNode } from "./node/rerankNode";
import { generateHintNode } from "./node/generateHintNode";

// 使用ドキュメントの初期状態準備
const transitionStates = { ...DOC.defaultTransitionStates };
const whoUseDocuments = DOC.whoDocuments.map((doc) => ({
  pageContent: doc.pageContent,
  metadata: { ...doc.metadata },
}));
const whyUseDocuments = DOC.whyDocuments.map((doc) => ({
  pageContent: doc.pageContent,
  metadata: { ...doc.metadata },
}));
let isPartialMatch = DOC.whyDocuments.map((doc) => ({
  pageContent: doc.pageContent,
  metadata: { ...doc.metadata },
}));

// デバック用変数
let globalDebugStep = 0;
// エントリーデータID(送信用)
let globalQaEntryId = "";
// ヒントに使ったエントリーデータ(次のターンも使いまわす)
let globalUsedEntry: UsedEntry[] = [];
// 起動しているホスト
let globalHost = "";

/**
 * langGraphのノード群
 */
async function setupInitial() {
  console.log("📝 初期設定ノード");

  const { states, contexts } = setupInitialNode({
    states: transitionStates,
    debugStep: globalDebugStep,
  });
  return {
    contexts: contexts,
    transition: { ...states },
    userAnswerData: [], // 初期化
  };
}

async function preprocessAI(state: typeof StateAnnotation.State) {
  console.log("🧠 AI 準備ノード");

  const { userAnswerDatas, matched, qaEmbeddings, getHint } =
    await preprocessAiNode({
      messages: state.messages,
      usedEntry: globalUsedEntry,
      step: state.transition.step,
      host: globalHost,
      whoUseDocuments: whoUseDocuments,
      whyUseDocuments: whyUseDocuments,
    });

  return {
    userAnswerData: userAnswerDatas,
    matched: matched,
    qaEmbeddings: qaEmbeddings,
    aiHint: getHint,
  };
}

async function checkUserAnswer(state: typeof StateAnnotation.State) {
  console.log("👀 ユーザー回答チェックノード");

  const { flag } = checkUserAnswerNode({
    matched: state.matched,
    transition: state.transition,
  });
  return { transition: flag };
}

async function rerank(state: typeof StateAnnotation.State) {
  console.log("👓 過去返答検索ノード");

  const { qaEntryId, usedEntry, contexts } = rerankNode({
    usedEntry: globalUsedEntry,
    host: globalHost,
    messages: state.messages,
    step: state.transition.step,
    qaEmbeddings: state.qaEmbeddings,
  });

  globalQaEntryId = qaEntryId;
  globalUsedEntry = JSON.parse(JSON.stringify(usedEntry));
  return { contexts: [...state.contexts, ...contexts] };
}

/**
 * ヒントを作成するノード
 * @param param0
 * @returns
 */
async function generateHint(state: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");

  const { contexts } = generateHintNode({
    isPartialMatch: isPartialMatch,
    whyUseDocuments: whyUseDocuments,
    userAnswerData: state.userAnswerData,
    step: state.transition.step,
    aiHint: state.aiHint,
  });

  return { contexts: [...state.contexts, ...contexts] };
}

/**
 * 質問文を生成するノード
 * @param param0
 * @returns
 */
async function askQuestion(state: typeof StateAnnotation.State) {
  console.log("❓ 問題出題ノード");
  const contexts = [];

  // プロンプトに追加
  contexts.push(MSG.BULLET + MSG.STUDENT_FEEDBACK_QUESTION_PROMPT + "\n");

  switch (state.transition.step) {
    case 0:
      contexts.push(MSG.FOR_REPORT_COMMUNICATION);
      break;
    case 1:
      contexts.push(MSG.REPORT_REASON_FOR_LEADER);
      // 残り問題数の出力
      const count = Object.values(whyUseDocuments).filter(
        (val) => val.metadata.isMatched === false
      ).length;
      if (count < 3) {
        contexts.push(`答えは残り ${count} つです。\n\n`);
      } else {
        contexts.push(MSG.THREE_ANSWER);
      }
      break;
  }
  return { contexts: [...state.contexts, ...contexts] };
}

/**
 * 回答解説を行うノード
 * @param state
 * @returns
 */
async function ExplainAnswer(state: typeof StateAnnotation.State) {
  console.log("📢 解答解説ノード");

  const contexts = [];
  contexts.push(MSG.BULLET + MSG.SUCCESS_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.SUMMARY_REQUEST_PROMPT);

  // ここで使用したエントリーの重みを変更
  if (globalUsedEntry.length != 0) {
    const qaList: QAEntry[] = Utils.writeQaEntriesQuality(
      globalUsedEntry,
      0.1,
      globalHost
    );
    fs.writeFileSync(
      qaEntriesFilePath(globalHost),
      JSON.stringify(qaList, null, 2)
    );
  }

  return { contexts: [...state.contexts, ...contexts] };
}

/**
 * 状態を保存するノード（ターンの最後）
 * @param state
 * @returns
 */
async function saveFinishState(state: typeof StateAnnotation.State) {
  console.log("💾 状態保存ノード");

  // 現在の状態を外部保存
  Object.assign(transitionStates, state.transition);
  transitionStates.isAnswerCorrect = false;

  // 正解し終わった場合すべてを初期化
  const contexts = [];
  if (!state.transition.hasQuestion) {
    console.log("質問終了");
    contexts.push(MSG.END_TAG);
    Object.assign(transitionStates, DOC.defaultTransitionStates);
    whoUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
    whyUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
  }

  return {
    contexts: [...state.contexts, ...contexts],
  };
}

/**
 * グラフ定義
 * messages: 今までのメッセージを保存しているもの
 */
const workflow = new StateGraph(StateAnnotation)
  // ノード
  .addNode("setup", setupInitial)
  .addNode("ai", preprocessAI)
  .addNode("check", checkUserAnswer)
  .addNode("rerank", rerank)
  .addNode("hint", generateHint)
  .addNode("ask", askQuestion)
  .addNode("explain", ExplainAnswer)
  .addNode("save", saveFinishState)
  // エッジ
  .addEdge("__start__", "setup")
  .addEdge("setup", "ai")
  .addEdge("ai", "check")
  .addConditionalEdges("check", (state) =>
    state.transition.isAnswerCorrect ? "explain" : "rerank"
  )
  .addEdge("rerank", "hint")
  .addEdge("hint", "ask")
  .addConditionalEdges("explain", (state) =>
    state.transition.hasQuestion ? "ask" : "save"
  )
  .addEdge("ask", "save")
  .addEdge("save", "__end__");

const app = workflow.compile();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = body.userMessage;

    const { host } = getBaseUrl(req);
    globalHost = host;
    globalDebugStep = Number(req.headers.get("step")) ?? 0;

    console.log("🏁 報連相ワーク ターン開始");

    // langgraph
    const result = await app.invoke({
      messages: userMessage,
    });
    console.log(result.contexts);
    const aiText = result.contexts.join("");

    console.log("🈡 報連相ワーク ターン終了");

    return new Response(
      JSON.stringify({
        text: aiText,
        contenue: !aiText.includes("--終了--"),
        qaEntryId: globalQaEntryId,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
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
