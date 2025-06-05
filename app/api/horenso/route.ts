import * as MESSAGES from "@/lib/messages";
import { embeddings, haiku3_5, strParser } from "@/lib/models";
import { HorensoFlags, HorensoStates } from "@/lib/type";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import {
  Annotation,
  messagesStateReducer,
  StateGraph,
} from "@langchain/langgraph";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const transitionStates = {
  isAnswerCorrect: false,
  hasQuestion: true,
};
const reasonFlags = {
  deadline: false,
  function: false,
  quality: false,
};

// step数
let step = 0;

async function setupInitial() {
  console.log("📝 初期設定ノード");

  // 前回ターンの状態を反映
  console.log("isAnswerCorrect: " + transitionStates.isAnswerCorrect);
  console.log("hasQuestion: " + transitionStates.hasQuestion);
  return {
    transition: { ...transitionStates },
  };
}

async function checkUserAnswer({
  messages,
  transition,
}: typeof StateAnnotation.State) {
  console.log("👀 ユーザー回答チェックノード");

  const userMessage = messages[messages.length - 1];
  const userAnswer =
    typeof userMessage.content === "string"
      ? userMessage.content
      : userMessage.content.map((c: any) => c.text ?? "").join("");

  switch (step) {
    case 0:
      console.log("質問1: 報連相は誰のため？");

      const targetAnswer1 = ["リーダー", "上司"];
      const targetMetadata1 = [
        { id: "1", quwstion_id: "1", question: "報連相は誰のためか" },
        { id: "2", quwstion_id: "1", question: "報連相は誰のためか" },
      ];

      const vectorStore1 = await MemoryVectorStore.fromTexts(
        targetAnswer1,
        targetMetadata1,
        embeddings
      );

      const result1 = await vectorStore1.similaritySearchWithScore(
        userAnswer,
        1
      );
      const [bestMatch, score] = result1[0];
      console.log("score: " + score + ", match: " + bestMatch.pageContent);

      // 正解パターン
      if (score >= 0.8) {
        step = 1;
        transitionStates.isAnswerCorrect = true;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");
      transitionStates.hasQuestion = false;

      const targetAnswer2 = [
        "納期や期限を守る",
        "機能に過不足がない",
        "品質が良く不具合がない",
      ];
      const targetMetadata2 = [
        {
          id: "1",
          quwstion_id: "2",
          question: "報連相はなぜリーダーのためなのか",
        },
        {
          id: "2",
          quwstion_id: "2",
          question: "報連相はなぜリーダーのためなのか",
        },
        {
          id: "3",
          quwstion_id: "2",
          question: "報連相はなぜリーダーのためなのか",
        },
      ];

      const vectorStore2 = await MemoryVectorStore.fromTexts(
        targetAnswer2,
        targetMetadata2,
        embeddings
      );
      const result2 = await vectorStore2.similaritySearchWithScore(
        userAnswer,
        3
      );

      // 上位３件を確認
      for (const [bestMatch, score] of result2) {
        console.log("score: " + score + ", match: " + bestMatch.pageContent);

        // スコアが閾値以上の場合3つのそれぞれのフラグを上げる
        if (score >= 0.6) {
          if (bestMatch.pageContent === targetAnswer2[0]) {
            reasonFlags.deadline = true;
          }
          if (bestMatch.pageContent === targetAnswer2[1]) {
            reasonFlags.function = true;
          }
          if (bestMatch.pageContent === targetAnswer2[2]) {
            reasonFlags.quality = true;
          }
        }
      }
      console.log("納期: " + reasonFlags.deadline);
      console.log("機能: " + reasonFlags.function);
      console.log("品質: " + reasonFlags.quality);

      // 全正解
      if (Object.values(reasonFlags).every(Boolean)) {
        transitionStates.isAnswerCorrect = true;
      }
      break;
  }

  return {
    transition: { ...transitionStates },
  };
}

async function generateHint({ contexts }: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");

  contexts = MESSAGES.HINTO_GIVING;

  return { contexts };
}

async function askQuestion({ contexts }: typeof StateAnnotation.State) {
  console.log("❓ 問題出題ノード");

  switch (step) {
    case 0:
      contexts = MESSAGES.QUESTION_WHO_ASKING;
      break;
    case 1:
      contexts = MESSAGES.QUESTION_WHY_ASKING;
      break;
  }

  return {
    contexts,
    transition: { ...transitionStates },
  };
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

  // 正解し終わった場合すべてを初期化
  if (!transition.hasQuestion && Object.values(reasonFlags).every(Boolean)) {
    console.log("質問終了");
    contexts += "--終了--";
    transitionStates.isAnswerCorrect = false;
    transitionStates.hasQuestion = true;
  }

  // contextsを出力
  return { messages: [...messages, new AIMessage(contexts)] };
}

/**
 * グラフ定義
 * messages: 今までのメッセージを保存しているもの
 */
const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  contexts: Annotation<string>({
    value: (state: string = "", action: string) => state + action,
    default: () => "",
  }),
  transition: Annotation<HorensoStates>({
    value: (
      state: HorensoStates = {
        isAnswerCorrect: false,
        hasQuestion: true,
      },
      action: Partial<HorensoStates>
    ) => ({
      ...state,
      ...action,
    }),
  }),
  flags: Annotation<HorensoFlags>({
    value: (
      state: HorensoFlags = {
        deadline: false,
        function: false,
        quality: false,
      },
      action: Partial<HorensoFlags>
    ) => ({
      ...state,
      ...action,
    }),
  }),
});

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
    const text = result.messages[1].content;

    const aiText =
      typeof result.messages[1].content === "string"
        ? result.messages[1].content
        : result.messages[1].content.map((c: any) => c.text ?? "").join("");

    console.log("langgraph: " + aiText);

    console.log("🈡 報連相ワーク ターン終了");

    const end = () => {
      if (aiText.includes("終了")) {
        return false;
      }
      return true;
    };

    return new Response(JSON.stringify({ text: text, contenue: end() }), {
      headers: { "Content-Type": "application/json" },
    });
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
