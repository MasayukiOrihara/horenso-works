import { PromptTemplate } from "@langchain/core/prompts";
import { LangChainAdapter } from "ai";
import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";

import { runWithFallback } from "@/lib/llm/run";
import { updateClueChat } from "../horenso/lib/match/lib/entry";
import { measureExecution } from "@/lib/llm/graph";

import * as TYPE from "@/lib/type";
import * as SCM from "@/lib/schema";
import * as ERR from "@/lib/message/error";
import * as MSG from "@/lib/contents/chat/template";
import * as REQ from "./requestApi";

import { computeFinalScoreWeightedAverage } from "./grade";
import { getBaseUrl } from "@/lib/utils";

/** 分岐ノード */
async function phaseRouter(state: typeof StateAnnotation.State) {
  console.log("🔘 分岐ノード");
  const debugOn = state.sessionFlags.options.debugOn;
  const sessionState = state.sessionFlags.phase;

  if (sessionState === "locked" && !debugOn) {
    return "init";
  }

  return "horensoWork";
}

/** 初回ノード */
async function init(state: typeof StateAnnotation.State) {
  console.log("🚪 初回ノード");
  const baseUrl = state.sessionFlags.baseUrl!;
  const messages = state.messages;
  const sessionId = state.sessionFlags.sessionId;

  // 過去の履歴取得（非同期）
  const fetchMemory = REQ.requestMemory(baseUrl, messages, sessionId);
  // ユーザープロファイルを取得
  const fetchUserprofile = REQ.requestUserprofile(baseUrl, sessionId);

  // 開発の解説と問題を AIメッセージ に取り込み
  const contexts: string[] = [];
  contexts.push(
    MSG.REPHRASE_WITH_LOGIC_PRESERVED.replace(
      "{sentence}",
      MSG.INTRO_TO_DEV_WORK
    )
  );
  contexts.push(MSG.QUESTION_WHO_ASKING);

  //並行処理
  const [memory, userprofile] = await Promise.all([
    fetchMemory,
    fetchUserprofile,
  ] as const);

  return {
    contexts: contexts,
    memory: memory,
    userprofile: userprofile,
  };
}

/** 報連相ワークノード */
async function horensoWork(state: typeof StateAnnotation.State) {
  console.log("🥬 報連相ワークノード");
  const messages = state.messages;
  const userMessage = state.userMessage;
  const sessionFlags = state.sessionFlags;
  const baseUrl = state.sessionFlags.baseUrl!;

  // sessionFlags内変数
  const sessionId = sessionFlags.sessionId;
  const options = sessionFlags.options;

  // 過去の履歴取得（非同期）
  const fetchMemory = REQ.requestMemory(baseUrl, messages, sessionId);
  // ユーザープロファイルを取得
  const fetchUserprofile = REQ.requestUserprofile(baseUrl, sessionId);
  // メッセージ保存: フロントエンドから記憶設定を取得
  const fetchSave = REQ.requestSave(baseUrl, messages, sessionId);

  // 報連相ワークAPI呼び出し
  const contexts: string[] = [];
  const fetchHorensoGraph = REQ.requestHorensoGraph(
    baseUrl,
    userMessage,
    sessionFlags
  );

  // 並列処理
  const savePromise = options.memoryOn ? fetchSave : undefined;
  const [memory, userprofile, horensoGraph] = await Promise.all([
    fetchMemory,
    fetchUserprofile,
    fetchHorensoGraph,
  ] as const);

  if (savePromise) await savePromise;

  // グラフからコンテキストを抽出
  contexts.push(horensoGraph.text);

  return {
    contexts: contexts,
    memory: memory,
    userprofile: userprofile,
    sessionFlags: horensoGraph.sessionFlags,
  };
}

async function endHorensoWork(state: typeof StateAnnotation.State) {
  console.log("🛎 終了判定ノード");
  const sessionState = state.sessionFlags.phase;

  // ログ表示
  console.log(`継続状態: ${sessionState}`);
  if (sessionState === "cleared") {
    return "calcGrade";
  }

  return "contextMerger";
}

async function calcGrade(state: typeof StateAnnotation.State) {
  console.log("📐 グレード計算ノード");
  const contexts = state.contexts;
  const sessionId = state.sessionFlags.sessionId;

  const { final, perQuestion } = await computeFinalScoreWeightedAverage(
    sessionId
  );

  const grade = Math.round(final * 100);
  console.log("perQuestion:", perQuestion);
  console.log("final(0..1):", final, " => 100点満点:", grade);

  // 終了の文言を追加
  contexts.push(MSG.FINISH_MESSAGE);

  return { contexts: contexts, grade: grade };
}

/** 研修終了ノード */
async function finalization() {
  console.log("🚪終了ノード");

  return;
}

/** コンテキストをまとめるノード */
async function contextMerger(state: typeof StateAnnotation.State) {
  console.log("📄 コンテキストノード");
  const sessionFlags = state.sessionFlags;
  const memory = state.memory;
  const userprofile = state.userprofile;
  const userMessage = state.userMessage;
  const contexts = state.contexts;

  // ユーザー情報を整形
  const excludeValues = ["", "none", "other"]; // 除外条件
  const userprofileFiltered = Object.entries(userprofile)
    .filter(([v]) => !excludeValues.includes(v))
    .map(([k, v]) => `${k}: ${v}`);

  const chatGraphResult: TYPE.ChatGraphResult = {
    memory: memory.join(", "),
    userprofile: userprofileFiltered.join(", "),
    userMessage: userMessage,
    context: contexts.join("\n\n"),
  };

  // 状態の変更
  if (sessionFlags.phase !== "cleared") sessionFlags.phase = "in_progress";

  return { chatGraphResult: chatGraphResult, sessionFlags: sessionFlags };
}

/** メイングラフ内の状態を司るアノテーション */
const StateAnnotation = Annotation.Root({
  sessionFlags: Annotation<TYPE.SessionFlags>(), // セッション中のフラグ
  userMessage: Annotation<string>(), // 最新のユーザーメッセージ
  contexts: Annotation<string[]>(), // グラフ内でコンテキストを管理する
  memory: Annotation<string[]>(), // 会話履歴
  userprofile: Annotation<SCM.userprofileFormValues>(), // 取得したユーザープロファイル
  chatGraphResult: Annotation<TYPE.ChatGraphResult>(), // 最終結果
  grade: Annotation<number>(), // 成績

  ...MessagesAnnotation.spec,
});

/**
 * グラフ定義
 * messages: 今までのメッセージを保存しているもの
 */
const workflow = new StateGraph(StateAnnotation)
  // ノード
  .addNode("init", init)
  .addNode("horensoWork", horensoWork)
  .addNode("finalization", finalization)
  .addNode("calcGrade", calcGrade)
  .addNode("contextMerger", contextMerger)
  // エッジ
  .addConditionalEdges("__start__", phaseRouter)
  .addEdge("init", "contextMerger")
  .addConditionalEdges("horensoWork", endHorensoWork)
  .addEdge("calcGrade", "contextMerger")
  .addEdge("finalization", "contextMerger")
  .addEdge("contextMerger", "__end__");

const app = workflow.compile();

/**
 * 報連相ワークAI のレスポンスメッセージ作成API3
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // フロントから今までのメッセージを取得
    const messages = body.messages ?? [];
    // 直近のメッセージを取得
    const userMessage = messages[messages.length - 1].content;
    // フロントからセッションID を取得
    const sessionId: string = body.sessionId;
    if (!sessionId) {
      console.error("💬 chat API POST error: " + ERR.SESSIONID_ERROR);
      return Response.json({ error: ERR.SESSIONID_ERROR }, { status: 400 });
    }
    // フロントからフラグを受け取る
    const sessionFlags: TYPE.SessionFlags = body.sessionFlags;
    if (!sessionFlags) {
      console.error("💬 chat API POST error: " + ERR.SESSIONID_ERROR);
      return Response.json({ error: ERR.SESSIONID_ERROR }, { status: 400 });
    }

    // フラグ内のsessionIdだけ更新
    sessionFlags.sessionId = sessionId;
    // url の取得
    if (!sessionFlags.baseUrl) {
      const { baseUrl } = getBaseUrl(req);
      sessionFlags.baseUrl = baseUrl;
    }
    // 同期: 送信済み応答まち
    sessionFlags.sync = "pending";

    console.log("====");
    console.log(sessionFlags);
    console.log("====");
    // langgraph
    const result = await measureExecution(app, "chat", {
      messages: messages,
      sessionFlags: sessionFlags,
      userMessage: userMessage,
    });

    /* --- --- LLM 処理 --- --- */
    // プロンプト読み込み
    const template = MSG.HORENSO_AI_KATO;
    const prompt = PromptTemplate.fromTemplate(template);

    // プロンプト全文を取得して表示
    const promptVariables = {
      chat_history: result.chatGraphResult.memory,
      userprofile: result.chatGraphResult.userprofile,
      user_message: result.chatGraphResult.userMessage,
      ai_message: result.chatGraphResult.context,
    };
    const clueId = result.sessionFlags.options.clueId ?? "";

    // ストリーミング応答を取得
    const lcStream = await runWithFallback(prompt, promptVariables, {
      mode: "stream",
      onStreamEnd: async (response: string) => {
        // assistant メッセージ保存
        await REQ.requestSave(
          sessionFlags.baseUrl!,
          messages,
          sessionFlags.sessionId
        );

        // 今回のエントリーにメッセージを追記
        if (!(clueId === "")) await updateClueChat(clueId, response);
      },
    });

    // 送るデータ
    const options = sessionFlags.options;
    const sendOptions: TYPE.SessionOptions = {
      ...options,
      clueId: clueId,
    };
    const sendData: TYPE.SendData = {
      ...sessionFlags.data,
      grade: result.grade,
    };
    const sendFlags: TYPE.SessionFlags = {
      sessionId: sessionId,
      phase: result.sessionFlags.phase,
      sync: "confirmed", // サーバ側で 確定済み
      step: result.sessionFlags.step,
      baseUrl: result.sessionFlags.baseUrl,
      options: sendOptions,
      data: sendData,
    };

    console.log("====");
    console.log(sendFlags);
    console.log("====");

    // ヘッダー情報に登録
    const headers = new Headers({
      "x-send-flags": Buffer.from(JSON.stringify(sendFlags)).toString("base64"),
    });

    const baseResponse = LangChainAdapter.toDataStreamResponse(lcStream);

    return new Response(baseResponse.body, {
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("💬 chat API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
