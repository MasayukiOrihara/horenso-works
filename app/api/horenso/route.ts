import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { StateGraph } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import { Document } from "langchain/document";
import fs from "fs";

import { QAEntry, QAMetadata, UserAnswerEvaluation } from "@/lib/type";
import * as MSG from "./contents/messages";
import * as DOC from "./contents/documents";
import { StateAnnotation } from "./lib/annotation";
import { findMatchStatusChanges, matchAnswerOpenAi } from "./lib/match";
import {
  cachedVectorStore,
  generateHintLlm,
  messageToText,
  sortScore,
  splitInputLlm,
} from "./lib/utils";
import { PromptTemplate } from "@langchain/core/prompts";
import { haiku3_5_sentence, strParser } from "@/lib/models";
import { QUESTION_WHO_ASKING } from "../../../lib/messages";
import { embeddings } from "../../../lib/models";
import path from "path";

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

// ユーザーデータの初期化
const userAnswerData: UserAnswerEvaluation[] = [];
// デバック用変数
let debugStep = 0;
// エントリーデータID(送信用)
let qaEntryId = "";

/**
 * langGraphの初期設定を行うノード
 * @param param0
 * @returns
 */
async function setupInitial({ contexts }: typeof StateAnnotation.State) {
  console.log("📝 初期設定ノード");

  // デバッグ時にstepを設定
  if (debugStep != 0) transitionStates.step = debugStep;

  // 前回ターンの状態を反映
  console.log("isAnswerCorrect: " + transitionStates.isAnswerCorrect);
  console.log("hasQuestion: " + transitionStates.hasQuestion);
  console.log("step: " + transitionStates.step);

  // 前提・背景・状況
  contexts = MSG.BULLET + MSG.INSTRUCTOR_INTRO_MESSAGE_PROMPT;
  contexts += MSG.BULLET + MSG.USER_QUESTION_LABEL_PROMPT + "\n";

  // 問題分岐
  switch (transitionStates.step) {
    case 0:
      contexts += MSG.FOR_REPORT_COMMUNICATION;
      break;
    case 1:
      contexts += MSG.REPORT_REASON_FOR_LEADER + MSG.THREE_ANSWER;
      break;
  }
  return {
    contexts,
    transition: { ...transitionStates },
  };
}

/**
 * ユーザーの回答をチェックするノード
 * @param param0
 * @returns
 */
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
      const whoUserAnswer = await splitInputLlm(
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
          userAnswerData,
        })
      );
      const whoResults = await Promise.all(matchWhoPromises);
      const tempIsWhoCorrect = whoResults.some((result) => result === true);
      console.log("\n OpenAI Embeddings チェック完了 \n ---");

      console.dir(userAnswerData, { depth: null });
      console.log("質問1の正解: " + tempIsWhoCorrect);

      // 正解パターン
      if (tempIsWhoCorrect) {
        transition.step = 1;
        transition.isAnswerCorrect = true;
      }
      break;
    case 1:
      console.log("質問2: なぜリーダーのため？");

      // 答えの分離
      const whyUserAnswer = await splitInputLlm(
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
          userAnswerData,
          allTrue: true,
        })
      );
      const whyResults = await Promise.all(matchWhyPromises);
      const tempIsWhyCorrect = whyResults.some((result) => result === true);
      console.log("\n OpenAI Embeddings チェック完了 \n ---");

      console.dir(userAnswerData, { depth: null });
      console.log("質問2の正解: " + tempIsWhyCorrect);

      // 全正解
      if (tempIsWhyCorrect) {
        transition.hasQuestion = false;
        transition.isAnswerCorrect = true;
      }
      break;
  }
  return { transition };
}

/**
 *
 * @param param0
 * @returns
 */
async function rerank({
  messages,
  contexts,
  transition,
}: typeof StateAnnotation.State) {
  console.log("👓 過去返答検索ノード");

  // JSONからデータの読み込み
  const qaEntriesFilePath = path.join(
    process.cwd(),
    "public",
    "advice",
    "qa-entries.json"
  );
  console.log("jsonファイルパス" + qaEntriesFilePath);

  // 既存データを読み込む（なければ空配列）
  let qaList: QAEntry[] = [];
  if (
    fs.existsSync(qaEntriesFilePath) &&
    fs.statSync(qaEntriesFilePath).size > 0
  ) {
    const raw = fs.readFileSync(qaEntriesFilePath, "utf-8");
    qaList = JSON.parse(raw);
  }

  // 埋め込み作成用にデータをマップ
  const documents: Document<QAMetadata>[] = qaList.map((qa) => ({
    pageContent: qa.userAnswer,
    metadata: {
      hint: qa.hint,
      ...qa.metadata,
    },
  }));

  // ユーザーの回答を埋め込み
  const userMessage = messageToText(messages, messages.length - 1);
  const embedding = await embeddings.embedQuery(userMessage);

  // ベクトルストア準備 + 比較
  const vectorStore = await cachedVectorStore(documents);
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
      timestamp: new Date(Date.now()).toISOString(),
      quality: 0.5,
      question_id: `${transition.step + 1}`,
      source: "bot",
    },
  };

  // 新しいエントリを追加
  qaList.push(qaEntry);
  // 上書き保存（整形付き）
  fs.writeFileSync(qaEntriesFilePath, JSON.stringify(qaList, null, 2));

  contexts = MSG.BULLET + "以下の過去の返答例を参考にしてください。\n\n";
  contexts += "この回答に対する過去の返答例: \n";

  for (const [bestMatch, score] of results) {
    console.log("score: " + score + ", match: " + bestMatch.pageContent);
    if (score >= 0.8) {
      contexts += `「${bestMatch.metadata.hint}」\n`;
    }
  }

  contexts += "\n";

  // console.log(qaEntry);
  return { contexts };
}

/**
 * ヒントを作成するノード
 * @param param0
 * @returns
 */
async function generateHint({
  transition,
  contexts,
}: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");

  // スコア順に並べ替え
  const top = sortScore(userAnswerData);
  console.dir(top, { depth: null });

  // 今回正解した差分を見つけ出す
  const changed = findMatchStatusChanges(isPartialMatch, whyUseDocuments);
  console.log("差分: " + changed.map((page) => page.pageContent));

  // プロンプトに含める
  if (Object.keys(changed).length > 0) {
    contexts = MSG.BULLET + MSG.PARTIAL_CORRECT_FEEDBACK_PROMPT;
    for (const page of changed) {
      for (const data of userAnswerData) {
        if (page.pageContent === data.currentAnswer && data.isAnswerCorrect) {
          console.log("部分正解: " + data.userAnswer);
          contexts += data.userAnswer + "\n";
        }
      }
    }
    contexts += "\n";
  } else {
    contexts = MSG.BULLET + MSG.CLEAR_FEEDBACK_PROMPT;
  }
  contexts += MSG.BULLET + MSG.COMMENT_ON_ANSWER_PROMPT;

  switch (transition.step) {
    case 0:
      console.log("ヒント1: 報連相は誰のため？");

      // ヒントを出力
      const getWhoHint = await generateHintLlm(
        MSG.GUIDED_ANSWER_PROMPT,
        MSG.FOR_REPORT_COMMUNICATION,
        top
      );
      console.log("質問1のヒント: " + getWhoHint);

      // プロンプトに含める
      // contexts += MSG.BULLET + MSG.USER_ADVICE_PROMPT;
      contexts += `ユーザーへの助言: --- \n ${getWhoHint}\n---\n`;
      break;
    case 1:
      console.log("ヒント2: なぜリーダーのため？");

      // ヒントを出力
      const getWhyHint = await generateHintLlm(
        MSG.GUIDED_ANSWER_PROMPT,
        MSG.THREE_ANSWER,
        top
      );
      console.log("質問2のヒント: " + getWhyHint);

      // 現在の正解を報告
      const count = Object.values(whyUseDocuments).filter(
        (val) => val.metadata.isMatched === true
      ).length;
      contexts += MSG.BULLET + MSG.CORRECT_PARTS_LABEL_PROMPT;
      contexts += `正解数 ${count} \n正解した項目: ${whyUseDocuments.map(
        (page) =>
          page.metadata.isMatched === true ? page.pageContent + ", " : ""
      )}`;
      contexts += "\n\n";

      // プロンプトに含める
      // contexts += MSG.BULLET + MSG.USER_ADVICE_PROMPT;
      contexts += `ユーザーへの助言: \n${getWhyHint}\n`;

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

  // プロンプトに追加
  contexts = MSG.BULLET + MSG.STUDENT_FEEDBACK_QUESTION_PROMPT + "\n";

  switch (transition.step) {
    case 0:
      contexts += MSG.FOR_REPORT_COMMUNICATION;
      break;
    case 1:
      contexts += MSG.REPORT_REASON_FOR_LEADER;
      const count = Object.values(whyUseDocuments).filter(
        (val) => val.metadata.isMatched === false
      ).length;
      if (count < 3) {
        contexts += `答えは残り ${count} つです。\n\n`;
      } else {
        contexts += MSG.THREE_ANSWER;
      }
      break;
  }
  return { contexts };
}

async function ExplainAnswer({
  transition,
  contexts,
}: typeof StateAnnotation.State) {
  console.log("📢 解答解説ノード");

  contexts = MSG.BULLET + MSG.SUCCESS_MESSAGE_PROMPT;
  contexts += MSG.BULLET + MSG.SUMMARY_REQUEST_PROMPT;

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
  userAnswerData.length = 0;

  // 正解し終わった場合すべてを初期化
  if (!transition.hasQuestion) {
    console.log("質問終了");
    contexts += MSG.END_TAG;
    Object.assign(transitionStates, DOC.defaultTransitionStates);
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
  .addNode("rerank", rerank)
  .addNode("hint", generateHint)
  .addNode("ask", askQuestion)
  .addNode("explain", ExplainAnswer)
  .addNode("save", saveFinishState)
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
  .addEdge("save", "__end__")
  .compile();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];
    const userMessage = messages[messages.length - 1].content;

    debugStep = Number(req.headers.get("step")) ?? 0;

    console.log("🏁 報連相ワーク ターン開始");

    // langgraph
    const result = await graph.invoke({
      messages: [new HumanMessage(userMessage)],
    });
    const aiText = messageToText(result.messages, 1);

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
