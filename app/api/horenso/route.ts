import { MemorySaver, StateGraph } from "@langchain/langgraph";
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";
import { Document } from "langchain/document";

import { getBaseUrl } from "@/lib/path";
import { measureExecution } from "@/lib/llm/graph";
import { requestApi } from "@/lib/api/request";
import { EVALUATION_DATA_PATH } from "@/lib/api/path";

import * as DOC from "@/lib/contents/horenso/documents";
import * as NODE from "./node";
import * as TYPE from "@/lib/type";
import * as ERR from "@/lib/message/error";
import { SessionFlags } from "../../../lib/type";

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

// ベースURL の共通化
let globalBaseUrl = "";

/**
 * langGraphのノード群
 */
/** 初期設定を行うノード */
async function setupInitial(state: typeof StateAnnotation.State) {
  const sessionFlags = state.sessionFlags;

  const { contexts, transition } = await NODE.setupInitialNode({
    sessionFlags: sessionFlags,
  });
  return {
    contexts: contexts,
    transition: transition,
    evaluationData: [], // 初期化
  };
}

/** AI が事前準備を行うノード */
async function preprocessAI(state: typeof StateAnnotation.State) {
  const messages = state.messages;
  const sessionFlags = state.sessionFlags;

  const { evaluationData, clue, getHint, category } =
    await NODE.preprocessAiNode({
      messages: messages,
      sessionFlags: sessionFlags,
      baseUrl: globalBaseUrl,
      whoUseDocuments: whoUseDocuments,
      whyUseDocuments: whyUseDocuments,
    });

  return {
    evaluationData: evaluationData,
    clue: clue,
    aiHint: getHint,
    inputCategory: category,
  };
}

async function checkUserAnswer(state: typeof StateAnnotation.State) {
  console.log("👀 ユーザー回答チェックノード");
  const sessionFlags = state.sessionFlags;

  const { flag, updateSessionFlags } = NODE.checkUserAnswerNode({
    whoUseDocuments: whoUseDocuments,
    whyUseDocuments: whyUseDocuments,
    transition: state.transition,
    sessionFlags: sessionFlags,
  });
  return { transition: flag, sessionFlags: updateSessionFlags };
}

async function rerank(state: typeof StateAnnotation.State) {
  console.log("👓 過去返答検索ノード");
  const sessionFlags = state.sessionFlags;

  const { updateSessionFlags, selectedClue, contexts } = await NODE.rerankNode({
    adjustedClue: state.adjustedClue,
    messages: state.messages,
    sessionFlags: sessionFlags,
    clue: state.clue,
    category: state.inputCategory,
  });

  return {
    contexts: [...state.contexts, ...contexts],
    adjustedClue: selectedClue,
    sessionFlags: updateSessionFlags,
  };
}

async function generateHint(state: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");
  const sessionFlags = state.sessionFlags;

  const { contexts } = await NODE.generateHintNode({
    whoUseDocuments: whoUseDocuments,
    whyUseDocuments: whyUseDocuments,
    evaluationData: state.evaluationData,
    sessionFlags: sessionFlags,
    aiHint: state.aiHint,
    category: state.inputCategory,
  });

  return { contexts: [...state.contexts, ...contexts] };
}

async function askQuestion(state: typeof StateAnnotation.State) {
  console.log("❓ 問題出題ノード");
  const step = state.sessionFlags.step;

  const { contexts } = NODE.askQuestionNode({
    step: step,
    whyUseDocuments: whyUseDocuments,
  });
  return { contexts: [...state.contexts, ...contexts] };
}

async function explainAnswer(state: typeof StateAnnotation.State) {
  console.log("📢 解答解説ノード");
  const adjustedClue = state.adjustedClue;

  const { contexts } = await NODE.explainAnswerNode({
    adjustedClue: adjustedClue,
  });
  return { contexts: [...state.contexts, ...contexts] };
}

/**
 * 状態を保存するノード（ターンの最後）
 * @param state
 * @returns
 */
async function saveFinishState(state: typeof StateAnnotation.State) {
  console.log("💾 状態保存ノード");
  const sessionFlags = state.sessionFlags;

  const { contexts, updateSessionFlags } = NODE.saveFinishStateNode({
    states: transitionStates,
    transition: state.transition,
    sessionFlags: sessionFlags,
    whoUseDocuments: whoUseDocuments,
    whyUseDocuments: whyUseDocuments,
  });
  return {
    contexts: [...state.contexts, ...contexts],
    sessionFlags: updateSessionFlags,
  };
}

/** メイングラフ内の状態を司るアノテーション */
const StateAnnotation = Annotation.Root({
  sessionFlags: Annotation<TYPE.SessionFlags>(),
  contexts: Annotation<string[]>(), // 最終出力を行うコンテキスト
  clue: Annotation<[Document<TYPE.ClueMetadata>, number][]>(), // 以前の回答の記録
  adjustedClue: Annotation<TYPE.AdjustedClue[]>(), // 重みづけした回答の記録
  aiHint: Annotation<string>(), // ヒント出力テキスト
  inputCategory: Annotation<string>(), // ユーザー入力分析出力テキスト
  evaluationData: Annotation<TYPE.Evaluation[]>(), // 回答評価データ
  transition: Annotation<TYPE.HorensoStates>(), // 全体のフラグ管理

  ...MessagesAnnotation.spec,
});

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
    // メッセージを取得
    const userMessage = body.userMessage;
    if (!userMessage) {
      console.error("🥬 horenso API POST error: " + ERR.MESSAGES_ERROR);
      return Response.json({ error: ERR.MESSAGES_ERROR }, { status: 400 });
    }
    // セッション情報 取得
    const sessionFlags: TYPE.SessionFlags = body.sessionFlags;
    if (!sessionFlags) {
      console.error("🥬 horenso API POST error: " + ERR.SESSIONID_ERROR);
      return Response.json({ error: ERR.SESSIONID_ERROR }, { status: 400 });
    }
    // memory server 設定
    const config = { configurable: { thread_id: sessionFlags.sessionId } };
    // url の取得
    const { baseUrl } = getBaseUrl(req);
    globalBaseUrl = baseUrl;

    // 実行
    const result = await measureExecution(
      app,
      "horenso",
      { messages: userMessage, sessionFlags },
      config
    );
    const aiText = result.contexts.join("");

    // ユーザー答えデータの管理
    const sendEvaluationData = result.evaluationData.filter(
      (item) => item.answerCorrect === "correct"
    );
    await requestApi(baseUrl, EVALUATION_DATA_PATH, {
      method: "POST",
      body: { sendEvaluationData },
    });

    // 返すオブジェクト
    const response: TYPE.HorensoWorkResponse = {
      text: aiText,
      sessionFlags: result.sessionFlags,
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("🥬 horenso API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
