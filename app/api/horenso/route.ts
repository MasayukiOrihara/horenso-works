import { MemorySaver, StateGraph } from "@langchain/langgraph";

import { UsedEntry } from "@/lib/type";
import * as DOC from "./contents/documents";
import { StateAnnotation } from "./lib/annotation";
import { getBaseUrl } from "@/lib/path";

import { setupInitialNode } from "./node/setupInitialNode";
import { preprocessAiNode } from "./node/preprocessAINode";
import { checkUserAnswerNode } from "./node/checkUserAnswerNode";
import { rerankNode } from "./node/rerankNode";
import { generateHintNode } from "./node/generateHintNode";
import { askQuestionNode } from "./node/askQuestionNode";
import { explainAnswerNode } from "./node/explainAnswerNode";
import { saveFinishStateNode } from "./node/saveFinishStateNode";

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

// デバック用変数
let globalDebugStep = 0;
// エントリーデータID(送信用)
let globalQaEntryId = "";
// ヒントに使ったエントリーデータ(次のターンも使いまわす)
let globalUsedEntry: UsedEntry[] = [];

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
    userAnswerDatas: [], // 初期化
  };
}

async function preprocessAI(state: typeof StateAnnotation.State) {
  console.log("🧠 AI 準備ノード");

  const { userAnswerDatas, matched, qaEmbeddings, getHint } =
    await preprocessAiNode({
      messages: state.messages,
      usedEntry: globalUsedEntry,
      step: state.transition.step,
      whoUseDocuments: whoUseDocuments,
      whyUseDocuments: whyUseDocuments,
    });

  return {
    userAnswerDatas: userAnswerDatas,
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
    messages: state.messages,
    step: state.transition.step,
    qaEmbeddings: state.qaEmbeddings,
  });

  globalQaEntryId = qaEntryId;
  globalUsedEntry = JSON.parse(JSON.stringify(usedEntry));
  return { contexts: [...state.contexts, ...contexts] };
}

async function generateHint(state: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");

  const { contexts } = generateHintNode({
    whoUseDocuments: whoUseDocuments,
    whyUseDocuments: whyUseDocuments,
    userAnswerDatas: state.userAnswerDatas,
    step: state.transition.step,
    aiHint: state.aiHint,
  });

  return { contexts: [...state.contexts, ...contexts] };
}

async function askQuestion(state: typeof StateAnnotation.State) {
  console.log("❓ 問題出題ノード");

  const { contexts } = askQuestionNode({
    step: state.transition.step,
    whyUseDocuments: whyUseDocuments,
  });
  return { contexts: [...state.contexts, ...contexts] };
}

async function explainAnswer(state: typeof StateAnnotation.State) {
  console.log("📢 解答解説ノード");

  const { contexts } = explainAnswerNode(globalUsedEntry);
  return { contexts: [...state.contexts, ...contexts] };
}

/**
 * 状態を保存するノード（ターンの最後）
 * @param state
 * @returns
 */
async function saveFinishState(state: typeof StateAnnotation.State) {
  console.log("💾 状態保存ノード");

  const { contexts } = saveFinishStateNode({
    states: transitionStates,
    transition: state.transition,
    whoUseDocuments: whoUseDocuments,
    whyUseDocuments: whyUseDocuments,
  });
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
  .addNode("explain", explainAnswer)
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

// 記憶の追加
const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = body.userMessage;

    globalDebugStep = Number(req.headers.get("step")) ?? 0;
    const { baseUrl } = getBaseUrl(req);

    console.log("🏁 報連相ワーク ターン開始");
    // langgraph
    const config = { configurable: { thread_id: "abc123" } };
    const result = await app.invoke(
      {
        messages: userMessage,
      },
      config
    );
    console.log(result.contexts);
    const aiText = result.contexts.join("");

    // ユーザー答えデータの管理
    const sendUserAnswerData = result.userAnswerDatas.filter(
      (item) => item.isAnswerCorrect === true
    );
    await fetch(baseUrl + "/api/user-answer-data", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ACCESS_TOKEN}`, // vercel用
      },
      body: JSON.stringify({ sendUserAnswerData }),
    });

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
