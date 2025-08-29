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
// ベースURL の共通化
let globalBaseUrl = "";

export type AdjustedClue = {
  id: string;
  rankScore: number; // 返答を順位付けで取得するためのスコア
  clue: string; // 返答のための手がかり
  quality: number; // 信頼度
};

/**
 * langGraphのノード群
 */
/** 初期設定を行うノード */
async function setupInitial(state: typeof StateAnnotation.State) {
  const { states, contexts } = NODE.setupInitialNode({
    states: transitionStates,
    debugStep: globalDebugStep,
  });
  return {
    contexts: contexts,
    transition: { ...states },
    evaluationData: [], // 初期化
  };
}

/** AI が事前準備を行うノード */
async function preprocessAI(state: typeof StateAnnotation.State) {
  const { evaluationData, clue, getHint, category } =
    await NODE.preprocessAiNode({
      messages: state.messages,
      step: state.transition.step,
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

  const { flag } = NODE.checkUserAnswerNode({
    whoUseDocuments: whoUseDocuments,
    whyUseDocuments: whyUseDocuments,
    transition: state.transition,
  });
  return { transition: flag };
}

async function rerank(state: typeof StateAnnotation.State) {
  console.log("👓 過去返答検索ノード");

  const { newClueId, selectedClue, contexts } = await NODE.rerankNode({
    adjustedClue: state.adjustedClue,
    messages: state.messages,
    step: state.transition.step,
    clue: state.clue,
    category: state.inputCategory,
  });

  return {
    contexts: [...state.contexts, ...contexts],
    adjustedClue: selectedClue,
    newClueId: newClueId,
  };
}

async function generateHint(state: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");

  const { contexts } = NODE.generateHintNode({
    whoUseDocuments: whoUseDocuments,
    whyUseDocuments: whyUseDocuments,
    evaluationData: state.evaluationData,
    step: state.transition.step,
    aiHint: state.aiHint,
    category: state.inputCategory,
  });

  return { contexts: [...state.contexts, ...contexts] };
}

async function askQuestion(state: typeof StateAnnotation.State) {
  console.log("❓ 問題出題ノード");

  const { contexts } = NODE.askQuestionNode({
    step: state.transition.step,
    whyUseDocuments: whyUseDocuments,
  });
  return { contexts: [...state.contexts, ...contexts] };
}

async function explainAnswer(state: typeof StateAnnotation.State) {
  console.log("📢 解答解説ノード");
  const adjustedClue = state.adjustedClue;

  const { contexts } = await NODE.explainAnswerNode(adjustedClue);
  return { contexts: [...state.contexts, ...contexts] };
}

/**
 * 状態を保存するノード（ターンの最後）
 * @param state
 * @returns
 */
async function saveFinishState(state: typeof StateAnnotation.State) {
  console.log("💾 状態保存ノード");

  const { contexts } = NODE.saveFinishStateNode({
    states: transitionStates,
    transition: state.transition,
    whoUseDocuments: whoUseDocuments,
    whyUseDocuments: whyUseDocuments,
  });
  return {
    contexts: [...state.contexts, ...contexts],
  };
}

/** メイングラフ内の状態を司るアノテーション */
const StateAnnotation = Annotation.Root({
  sessionId: Annotation<string>(), // フロントで管理しているセッションID
  contexts: Annotation<string[]>(), // 最終出力を行うコンテキスト
  clue: Annotation<[Document<TYPE.ClueMetadata>, number][]>(), // 以前の回答の記録
  adjustedClue: Annotation<AdjustedClue[]>(), // 重みづけした回答の記録
  aiHint: Annotation<string>(), // ヒント出力テキスト
  inputCategory: Annotation<string>(), // ユーザー入力分析出力テキスト
  evaluationData: Annotation<TYPE.Evaluation[]>(), // 回答評価データ
  newClueId: Annotation<string>(), // 新しい clueID clueをstream後登録するために使う
  transition: Annotation<TYPE.HorensoStates>({
    // フラグ
    value: (
      state: TYPE.HorensoStates = {
        isAnswerCorrect: false,
        hasQuestion: true,
        step: 0,
      },
      action: Partial<TYPE.HorensoStates>
    ) => ({
      ...state,
      ...action,
    }),
  }),

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
    // セッションID 取得
    const sessionId = body.sessionId;
    if (!sessionId) {
      console.error("🥬 horenso API POST error: " + ERR.SESSIONID_ERROR);
      return Response.json({ error: ERR.SESSIONID_ERROR }, { status: 400 });
    }
    // memory server 設定
    const config = { configurable: { thread_id: sessionId } };
    // デバック用のステップ数を取得
    globalDebugStep = body.step ?? 0;
    // url の取得
    const { baseUrl } = getBaseUrl(req);
    globalBaseUrl = baseUrl;

    // 実行
    const result = await measureExecution(
      app,
      "horenso",
      { messages: userMessage, sessionId },
      config
    );
    // console.log(result.contexts);
    const aiText = result.contexts.join("");

    // ユーザー答えデータの管理
    const sendEvaluationData = result.evaluationData.filter(
      (item) => item.answerCorrect === "correct"
    );
    await requestApi(baseUrl, EVALUATION_DATA_PATH, {
      method: "POST",
      body: { sendEvaluationData },
    });

    return Response.json(
      {
        text: aiText,
        contenue: !aiText.includes("--終了--"),
        clueId: result.newClueId,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("🥬 horenso API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
