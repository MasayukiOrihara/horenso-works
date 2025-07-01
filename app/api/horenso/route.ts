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
import { embeddings } from "../../../lib/models";
import { getBaseUrl, qaEntriesFilePath, timestamp } from "@/lib/path";

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
let debugStep = 0;
// エントリーデータID(送信用)
let qaEntryId = "";
// ヒントに使ったエントリーデータ(次のターンも使いまわす)
let usedEntry: UsedEntry[] = [];
// 起動しているホスト
let usingHost = "";

/**
 * langGraphの初期設定を行うノード
 * @param param0
 * @returns
 */
async function setupInitial(state: typeof StateAnnotation.State) {
  console.log("📝 初期設定ノード");

  // デバッグ時にstepを設定
  if (debugStep != 0) transitionStates.step = debugStep;

  console.log("受け取った messages 確認");
  console.log(state.messages);

  // 前回ターンの状態を反映
  console.log("前回ターンの状態変数");
  console.log(transitionStates);

  // 前提・背景・状況
  const contexts = [];
  contexts.push(MSG.BULLET + MSG.INSTRUCTOR_INTRO_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.USER_QUESTION_LABEL_PROMPT + "\n");

  // 問題分岐
  switch (transitionStates.step) {
    case 0:
      contexts.push(MSG.FOR_REPORT_COMMUNICATION);
      break;
    case 1:
      contexts.push(MSG.REPORT_REASON_FOR_LEADER + MSG.THREE_ANSWER);
      break;
  }

  return {
    contexts: contexts,
    transition: { ...transitionStates },
    userAnswerData: [],
  };
}

/**
 * ユーザーの回答をチェックするノード
 * @param param0
 * @returns
 */
async function checkUserAnswer(state: typeof StateAnnotation.State) {
  console.log("👀 ユーザー回答チェックノード");

  const userMessage = Utils.messageToText(
    state.messages,
    state.messages.length - 1
  );
  console.log("userMessage: " + userMessage);

  const data: UserAnswerEvaluation[] = [];
  const flag: HorensoStates = { ...state.transition };
  switch (state.transition.step) {
    case 0:
      console.log("質問1: 報連相は誰のため？");

      // 答えの分離
      const whoUserAnswer = await Utils.splitInputLlm(
        MSG.KEYWORD_EXTRACTION_PROMPT,
        userMessage
      );
      console.log("質問1の答え: " + whoUserAnswer);

      // 正解チェック(OpenAi埋め込みモデル使用)
      const matchWhoPromises = whoUserAnswer.map((answer) =>
        matchAnswerOpenAi({
          userAnswer: answer,
          documents: whoUseDocuments,
          topK: 1,
          threshold: 0.8,
          userAnswerData: data,
        })
      );
      const whoResults = await Promise.all(matchWhoPromises);
      const tempIsWhoCorrect = whoResults.some((result) => result === true);
      console.log("\n OpenAI Embeddings チェック完了 \n ---");

      console.dir(data, { depth: null });
      console.log("質問1の正解: " + tempIsWhoCorrect);

      // 正解パターン
      if (tempIsWhoCorrect) {
        flag.step = 1;
        flag.isAnswerCorrect = true;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");

      // 答えの分離
      const whyUserAnswer = await Utils.splitInputLlm(
        MSG.CLAIM_EXTRACTION_PROMPT,
        userMessage
      );
      console.log("なぜの答え: \n" + whyUserAnswer);

      // 正解チェック(OpenAi埋め込みモデル使用)
      const matchWhyPromises = whyUserAnswer.map((answer) =>
        matchAnswerOpenAi({
          userAnswer: answer,
          documents: whyUseDocuments,
          topK: 3,
          threshold: 0.65,
          userAnswerData: data,
          allTrue: true,
        })
      );
      const whyResults = await Promise.all(matchWhyPromises);
      const tempIsWhyCorrect = whyResults.some((result) => result === true);
      console.log("\n OpenAI Embeddings チェック完了 \n ---");

      console.dir(data, { depth: null });
      console.log("質問2の正解: " + tempIsWhyCorrect);

      // 全正解
      if (tempIsWhyCorrect) {
        flag.hasQuestion = false;
        flag.isAnswerCorrect = true;
      }
      break;
  }
  return { transition: flag, userAnswerData: data };
}

/**
 *
 * @param param0
 * @returns
 */
async function rerank(state: typeof StateAnnotation.State) {
  console.log("👓 過去返答検索ノード");

  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = Utils.writeQaEntriesQuality(
    usedEntry,
    -0.1,
    usingHost
  );

  // 埋め込み作成用にデータをマップ
  const documents: Document<QAMetadata>[] = qaList.map((qa) => ({
    pageContent: qa.userAnswer,
    metadata: {
      hint: qa.hint,
      id: qa.id,
      ...qa.metadata,
    },
  }));

  // ユーザーの回答を埋め込み
  const userMessage = Utils.messageToText(
    state.messages,
    state.messages.length - 1
  );
  console.log("userMessage: " + userMessage);
  const embedding = await embeddings.embedQuery(userMessage);

  // ベクトルストア準備 + 比較
  const vectorStore = await Utils.cachedVectorStore(documents);
  console.log("ベクトルストア設置完了");
  const results = await vectorStore.similaritySearchVectorWithScore(
    embedding,
    5
  );

  // エントリーデータ蓄積用
  qaEntryId = uuidv4();
  const qaEntry: QAEntry = {
    id: qaEntryId,
    userAnswer: userMessage,
    hint: "",
    metadata: {
      timestamp: timestamp,
      quality: 0.5,
      question_id: `${state.transition.step + 1}`,
      source: "bot",
    },
  };

  // 新しいエントリを追加 + 上書き保存（整形付き）
  qaList.push(qaEntry);
  fs.writeFileSync(
    qaEntriesFilePath(usingHost),
    JSON.stringify(qaList, null, 2)
  );

  const contexts = [];
  contexts.push(MSG.BULLET + MSG.PAST_REPLY_HINT_PROMPT);
  contexts.push(MSG.ANSWER_EXAMPLE_PREFIX_PROMPT);

  // データ取得
  const rankedResults: UsedEntry[] = Utils.getRankedResults(results);

  // sum の高い順に並べて、上位2件を取得
  usedEntry = rankedResults.sort((a, b) => b.sum - a.sum).slice(0, 2);
  for (const result of usedEntry) {
    console.log("エントリートップ2: " + result.entry.metadata.id);
    contexts.push(`${result.entry.metadata.hint}\n ***** \n`);
  }
  contexts.push("\n");

  return { contexts: [...state.contexts, ...contexts] };
}

/**
 * ヒントを作成するノード
 * @param param0
 * @returns
 */
async function generateHint(state: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");

  // スコア順に並べ替え
  const top = Utils.sortScore(state.userAnswerData);
  console.dir(top, { depth: null });

  // 今回正解した差分を見つけ出す
  const changed = findMatchStatusChanges(isPartialMatch, whyUseDocuments);
  console.log("差分: " + changed.map((page) => page.pageContent));

  // プロンプトに含める
  const contexts = [];
  if (Object.keys(changed).length > 0) {
    contexts.push(MSG.BULLET + MSG.PARTIAL_CORRECT_FEEDBACK_PROMPT);
    for (const page of changed) {
      for (const data of state.userAnswerData) {
        if (page.pageContent === data.currentAnswer && data.isAnswerCorrect) {
          console.log("部分正解: " + data.userAnswer);
          contexts.push(data.userAnswer + "\n");
        }
      }
    }
    contexts.push("\n");
  } else {
    contexts.push(MSG.BULLET + MSG.CLEAR_FEEDBACK_PROMPT);
  }
  contexts.push(MSG.BULLET + MSG.COMMENT_ON_ANSWER_PROMPT);

  switch (state.transition.step) {
    case 0:
      console.log("ヒント1: 報連相は誰のため？");

      // ヒントを出力
      const getWhoHint = await Utils.generateHintLlm(
        MSG.GUIDED_ANSWER_PROMPT,
        MSG.FOR_REPORT_COMMUNICATION,
        top
      );
      console.log("質問1のヒント: " + getWhoHint);

      // プロンプトに含める
      contexts.push(
        `ユーザーへの助言: ---------- \n ${getWhoHint}\n -----------\n`
      );
      break;
    case 1:
      console.log("ヒント2: なぜリーダーのため？");

      // ヒントを出力
      const getWhyHint = await Utils.generateHintLlm(
        MSG.GUIDED_ANSWER_PROMPT,
        MSG.THREE_ANSWER,
        top
      );
      console.log("質問2のヒント: " + getWhyHint);

      // 現在の正解を報告
      const count = Object.values(whyUseDocuments).filter(
        (val) => val.metadata.isMatched === true
      ).length;
      contexts.push(MSG.BULLET + MSG.CORRECT_PARTS_LABEL_PROMPT);
      contexts.push(
        `正解数 ${count} \n正解した項目: ${whyUseDocuments.map((page) =>
          page.metadata.isMatched === true ? page.pageContent + ", " : ""
        )}`
      );
      contexts.push("\n\n");

      // プロンプトに含める
      contexts.push(
        `ユーザーへの助言: ---------- \n ${getWhyHint}\n -----------\n`
      );

      isPartialMatch = whyUseDocuments.map((doc) => ({
        pageContent: doc.pageContent,
        metadata: { ...doc.metadata },
      }));
      break;
  }

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
  if (usedEntry.length != 0) {
    const qaList: QAEntry[] = Utils.writeQaEntriesQuality(
      usedEntry,
      0.1,
      usingHost
    );
    fs.writeFileSync(
      qaEntriesFilePath(usingHost),
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
  .addNode("check", checkUserAnswer)
  .addNode("rerank", rerank)
  .addNode("hint", generateHint)
  .addNode("ask", askQuestion)
  .addNode("explain", ExplainAnswer)
  .addNode("save", saveFinishState)
  // エッジ
  .addEdge("__start__", "setup")
  .addEdge("setup", "check")
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

// 記憶の引継ぎ
const memory = new MemorySaver();
const app = workflow.compile({ checkpointer: memory });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = body.userMessage;

    const { host } = getBaseUrl(req);
    usingHost = host;

    debugStep = Number(req.headers.get("step")) ?? 0;

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

    console.log("🈡 報連相ワーク ターン終了");

    return new Response(
      JSON.stringify({
        text: aiText,
        contenue: !aiText.includes("終了"),
        qaEntryId: qaEntryId,
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
