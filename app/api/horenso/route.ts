import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StateGraph } from "@langchain/langgraph";

import * as MESSAGES from "@/lib/messages";
import {
  findMatchStatusChanges,
  matchAnswerHuggingFaceAPI,
  matchAnswerOpenAi,
  messageToText,
  StateAnnotation,
} from "./utils";
import * as DOCUMENTS from "./documents";
import {
  haiku3,
  haiku3_5,
  haiku3_5_sentence,
  listParser,
  strParser,
} from "@/lib/models";
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
let isPartialMatch = DOCUMENTS.whyDocuments.map((doc) => ({
  pageContent: doc.pageContent,
  metadata: { ...doc.metadata },
}));

export type UserAnswerEvaluation = {
  question_id: string;
  userAnswer: string;
  currentAnswer: string;
  score: string;
  isAnswerCorrect: boolean;
};

const userAnswerData: UserAnswerEvaluation[] = [];

async function setupInitial({ contexts }: typeof StateAnnotation.State) {
  console.log("📝 初期設定ノード");

  // 前回ターンの状態を反映
  console.log("isAnswerCorrect: " + transitionStates.isAnswerCorrect);
  console.log("hasQuestion: " + transitionStates.hasQuestion);
  console.log("step: " + transitionStates.step);

  // 前提・背景・状況
  contexts = "- あなたは講師として報連相ワークを行っています。\n";
  contexts += "- ユーザーに以下の質問を投げかけています。\n\n";
  contexts +=
    " 質問: ソフトウェア開発の仕事を想定した場合、報連相は誰のためのものか唯一誰か一人を上げてください。\n\n";
  return {
    contexts,
    transition: { ...transitionStates },
  };
}

async function checkUserAnswer({
  messages,
  transition,
  contexts,
}: typeof StateAnnotation.State) {
  console.log("👀 ユーザー回答チェックノード");

  const userMessage = messageToText(messages, messages.length - 1);

  switch (transition.step) {
    case 0:
      console.log("質問1: 報連相は誰のため？");

      // 答えの分離
      // const whoTemplate = MESSAGES.QUESTION_WHO_CHECK;
      const whoTemplate =
        "以下の入力に含まれる単語のうち、重要なキーワードを5個以内でリストアップしてください。新たな言葉は追加しないでください。\n： {input}\n\n{format_instructions}";
      const whoPrompt = PromptTemplate.fromTemplate(whoTemplate);
      const whoUserAnswer = await whoPrompt
        .pipe(haiku3_5_sentence)
        .pipe(listParser)
        .invoke({
          input: userMessage,
          format_instructions: listParser.getFormatInstructions(),
        });

      console.log("質問1の答え: " + whoUserAnswer);

      // 正解チェック
      let isWhoCorrect = false;
      for (const answer of whoUserAnswer) {
        const isWhoCorrectOpenAi = await matchAnswerOpenAi({
          userAnswer: answer,
          documents: whoUseDocuments,
          topK: 1,
          threshold: 0.8,
          userAnswerData,
        });

        if (isWhoCorrectOpenAi) isWhoCorrect = true;
      }
      console.log("データ取得");
      console.log("\n OpenAI Embeddings チェック完了 \n ---");

      // 重いので一旦削除
      // for (const answer of whoUserAnswer) {
      //   if (!isWhoCorrectOpenAi) {
      //     // 高性能モデルでもう一度検証
      //     isWhoCorrectOpenAi = await matchAnswerHuggingFaceAPI(
      //       answer,
      //       whoUseDocuments,
      //       0.7,
      //       userAnswerData
      //     );
      //   }
      // }
      // console.log("\n HuggingFace チェック完了 \n ---");

      console.dir(userAnswerData, { depth: null });
      console.log("質問1の正解: " + isWhoCorrect);

      // 正解パターン
      if (isWhoCorrect) {
        transition.step = 1;
        transition.isAnswerCorrect = true;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");

      // 答えの分離
      const whyTemplate = MESSAGES.QUESTION_WHY_CHECK;
      const whyPrompt = PromptTemplate.fromTemplate(whyTemplate);
      const whyUserAnswer = await whyPrompt
        .pipe(haiku3_5_sentence)
        .pipe(listParser)
        .invoke({
          input: userMessage,
          format_instructions: listParser.getFormatInstructions(),
        });
      console.log("なぜの答え: \n" + whyUserAnswer);

      // 正解チェック
      let tempIsWhyCorrect = false;
      for (const answer of whyUserAnswer) {
        const isWhyCorrect = await matchAnswerOpenAi({
          userAnswer: answer,
          documents: whyUseDocuments,
          topK: 3,
          threshold: 0.65,
          userAnswerData,
          allTrue: true,
        });

        tempIsWhyCorrect = isWhyCorrect;
      }

      // 全正解
      if (tempIsWhyCorrect) {
        transition.hasQuestion = false;
        transition.isAnswerCorrect = true;
      }
      break;
  }

  return { transition };
}

async function generateHint({
  transition,
  contexts,
}: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");

  switch (transition.step) {
    case 0:
      console.log("ヒント1: 報連相は誰のため？");

      // スコア順に並べ替え
      const top = userAnswerData
        .slice()
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 3);

      // ヒントを出力
      const hintTemplate =
        "以下の問題に対して、ユーザー自身が模範解答にたどり着くように導いてください。出力時は模範解答を伏せた文章を出力してください。\n\n 問題： {question}\n模範解答: {currect_answer}\n\nユーザーの回答: {user_answer}\n\nヒント: ";
      const hintPrompt = PromptTemplate.fromTemplate(hintTemplate);
      const getHint = await hintPrompt
        .pipe(haiku3_5_sentence)
        .pipe(strParser)
        .invoke({
          question:
            "ソフトウェア開発の仕事を想定した場合、報連相は誰のためのものか唯一誰か一人を上げてください。",
          currect_answer: top.map((val) => val.currentAnswer).join(", "),
          user_answer: top.map((val) => val.userAnswer).join(", "),
        });

      console.log("質問1のヒント: " + getHint);

      // プロンプトに含める
      contexts =
        "- まず初めにユーザーは答えを外したので、はっきり不正解と出力してください。\n";
      contexts += "- 次にユーザーの回答に一言コメントしてください。\n";
      contexts += `- さらに以下のユーザーへの助言を参考に、ユーザーから回答を引き出してください。また質問の答えとなりそうな"誰か"やキーワードは出力しないでください。\n\nユーザーへの助言: \n${getHint}`;
      contexts += "\n";
      break;
    case 1:
      console.log("ヒント2: なぜリーダーのため？");

      const changed = findMatchStatusChanges(isPartialMatch, whyUseDocuments);
      console.log("差分: " + JSON.stringify(changed, null, 2));

      // 部分正解
      for (const item of changed) {
        contexts += item.pageContent + MESSAGES.MATCH_OF_PIECE;
      }

      isPartialMatch = whyUseDocuments.map((doc) => ({
        pageContent: doc.pageContent,
        metadata: { ...doc.metadata },
      }));
      break;
  }

  return { contexts };
}

async function askQuestion({
  transition,
  contexts,
}: typeof StateAnnotation.State) {
  console.log("❓ 問題出題ノード");

  contexts =
    "- 上記について話したのち、最後に生徒に下記の質問をしてください。\n\n";

  switch (transition.step) {
    case 0:
      contexts +=
        " 質問: ソフトウェア開発の仕事を想定した場合、報連相は誰のためのものか唯一誰か一人を上げてください。";
      break;
    case 1:
      contexts +=
        " 質問: 報連相はなぜリーダーのためのものなのか。答えを3つ上げてください。";
      break;
  }
  return { contexts };
}

async function ExplainAnswer({
  transition,
  contexts,
}: typeof StateAnnotation.State) {
  console.log("📢 解答解説ノード");

  contexts = "- " + MESSAGES.SUCCESS_MESSAGE;
  contexts +=
    "- 今までの会話をまとめ、ユーザーの記憶に残るような質問の解説をしてください。\n";

  switch (transition.step) {
    case 0:
      break;
    case 1:
      break;
  }

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

  // 使ったオブジェクトを初期化
  for (const key of Object.keys(userAnswerData)) {
    delete userAnswerData[Number(key)];
  }

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
