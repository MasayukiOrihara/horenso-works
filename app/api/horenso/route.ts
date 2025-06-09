import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StateGraph } from "@langchain/langgraph";

import * as MESSAGES from "@/lib/messages";
import { matchAnswer, messageToText, StateAnnotation } from "./utils";
import * as DOCUMENTS from "./documents";
import { haiku3, strParser } from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";

// 初期状態準備
const transitionStates = { ...DOCUMENTS.defaultTransitionStates };
const whoUseDocuments = DOCUMENTS.whoDocuments.map((doc) => ({
  pageContent: doc.pageContent,
  metadata: { ...doc.metadata },
}));
const whyUseDocuments = DOCUMENTS.whyDocuments.map((doc) => ({
  pageContent: doc.pageContent,
  metadata: { ...doc.metadata },
}));

async function setupInitial() {
  console.log("📝 初期設定ノード");

  // 前回ターンの状態を反映
  console.log("isAnswerCorrect: " + transitionStates.isAnswerCorrect);
  console.log("hasQuestion: " + transitionStates.hasQuestion);
  console.log("step: " + transitionStates.step);
  return {
    transition: { ...transitionStates },
  };
}

async function checkUserAnswer({
  messages,
  transition,
}: typeof StateAnnotation.State) {
  console.log("👀 ユーザー回答チェックノード");

  const userMessage = messageToText(messages, messages.length - 1);

  switch (transition.step) {
    case 0:
      console.log("質問1: 報連相は誰のため？");

      // 答えの分離
      const template =
        "{input}\nこの文章から「自分」などの一人称も含め、人物を1人抜き出してください。単語の場合はそのまま出力し、複数人いる場合は主題の人物を1人抜き出してください。出力は抜き出した人物のみでお願いします。抜き出せなかった場合は「NO」とだけ出力してください。";
      const prompt = PromptTemplate.fromTemplate(template);
      const userAnswer = await prompt.pipe(haiku3).pipe(strParser).invoke({
        input: userMessage,
      });

      console.log("質問1の答え: " + userAnswer);

      // 正解チェック
      const isWhoCorrect = await matchAnswer({
        userAnswer: userAnswer,
        documents: whoUseDocuments,
        topK: 1,
        threshold: 0.8,
      });

      // 正解パターン
      if (isWhoCorrect) {
        transition.step = 1;
        transition.isAnswerCorrect = true;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");

      // 正解チェック
      const isWhyCorrect = await matchAnswer({
        userAnswer: userMessage,
        documents: whyUseDocuments,
        topK: 3,
        threshold: 0.6,
        allTrue: true,
      });

      // 全正解
      if (isWhyCorrect) {
        transition.hasQuestion = false;
        transition.isAnswerCorrect = true;
      }
      break;
  }
  return { transition };
}

async function generateHint({ contexts }: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");

  contexts = MESSAGES.HINTO_GIVING;

  return { contexts };
}

async function askQuestion({
  transition,
  contexts,
}: typeof StateAnnotation.State) {
  console.log("❓ 問題出題ノード");

  switch (transition.step) {
    case 0:
      contexts = MESSAGES.QUESTION_WHO_ASKING;
      break;
    case 1:
      contexts = MESSAGES.QUESTION_WHY_ASKING;
      break;
  }
  return { contexts };
}

async function ExplainAnswer({ contexts }: typeof StateAnnotation.State) {
  console.log("📢 解答解説ノード");

  contexts = MESSAGES.SUCCESS_MESSAGE;

  return { contexts };
}

async function saveFinishState({
  messages,
  contexts,
  transition,
}: typeof StateAnnotation.State) {
  console.log("💾 状態保存ノード");

  // 現在の状態を外部保存
  Object.assign(transitionStates, transition);
  transitionStates.isAnswerCorrect = false;

  // 正解し終わった場合すべてを初期化
  if (!transition.hasQuestion) {
    console.log("質問終了");
    contexts += "--終了--";
    Object.assign(transitionStates, DOCUMENTS.defaultTransitionStates);
    whoUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
    whyUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
  }

  // contextsを出力
  return {
    messages: [...messages, new AIMessage(contexts)],
  };
}

/**
 * グラフ定義
 * messages: 今までのメッセージを保存しているもの
 */
const graph = new StateGraph(StateAnnotation)
  .addNode("setup", setupInitial)
  .addNode("check", checkUserAnswer)
  .addNode("hint", generateHint)
  .addNode("ask", askQuestion)
  .addNode("explain", ExplainAnswer)
  .addNode("save", saveFinishState)
  .addEdge("__start__", "setup")
  .addEdge("setup", "check")
  .addConditionalEdges("check", (state) =>
    state.transition.isAnswerCorrect ? "explain" : "hint"
  )
  .addEdge("hint", "ask")
  .addConditionalEdges("explain", (state) =>
    state.transition.hasQuestion ? "ask" : "save"
  )
  .addEdge("ask", "save")
  .addEdge("save", "__end__")
  .compile();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const userMessage = messages[messages.length - 1].content;

    console.log("🏁 報連相ワーク ターン開始");

    // langgraph
    const result = await graph.invoke({
      messages: [new HumanMessage(userMessage)],
    });
    const aiText = messageToText(result.messages, 1);

    console.log("🈡 報連相ワーク ターン終了");

    return new Response(
      JSON.stringify({ text: aiText, contenue: !aiText.includes("終了") }),
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
