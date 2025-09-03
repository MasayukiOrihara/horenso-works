import { PromptTemplate } from "@langchain/core/prompts";
import { LangChainAdapter } from "ai";
import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";

import { getBaseUrl } from "@/lib/path";
import { runWithFallback } from "@/lib/llm/run";
import { updateClueChat } from "../horenso/lib/match/lib/entry";
import { measureExecution } from "@/lib/llm/graph";

import * as TYPE from "@/lib/type";
import * as SCM from "@/lib/schema";
import * as ERR from "@/lib/message/error";
import * as MSG from "@/lib/contents/chat/template";
import * as REQ from "./requestApi";

// 外部フラグ
let horensoContenue = false;
let oldHorensoContenue = false;

/** 分岐ノード */
async function phaseRouter(state: typeof StateAnnotation.State) {
  console.log("🔘 分岐ノード");
  const debug = state.options.debug;

  horensoContenue = true;
  if (horensoContenue && !oldHorensoContenue && !debug) {
    return "init";
  }

  return "horensoWork";
}

/** 初回ノード */
async function init(state: typeof StateAnnotation.State) {
  console.log("🚪 初回ノード");
  const baseUrl = state.baseUrl;
  const messages = state.messages;
  const sessionId = state.sessionId;

  oldHorensoContenue = true;

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
  const tasks: Promise<any>[] = [fetchMemory, fetchUserprofile];
  const [memory, userprofile] = await Promise.all(tasks);

  return {
    contexts: contexts,
    memory: memory,
    userprofile: userprofile,
  };
}

/** 報連相ワークノード */
async function horensoWork(state: typeof StateAnnotation.State) {
  console.log("🥬 報連相ワークノード");
  const baseUrl = state.baseUrl;
  const messages = state.messages;
  const userMessage = state.userMessage;
  const sessionId = state.sessionId;
  const options = state.options;

  // 過去の履歴取得（非同期）
  const fetchMemory = REQ.requestMemory(baseUrl, messages, sessionId);
  // ユーザープロファイルを取得
  const fetchUserprofile = REQ.requestUserprofile(baseUrl, sessionId);
  // メッセージ保存: フロントエンドから記憶設定を取得
  const fetchSave = REQ.requestSave(baseUrl, messages, sessionId);

  // 報連相ワークAPI呼び出し
  const contexts: string[] = [];
  const step = options.debug ? options.step : 0; // デバック用のステップ数設定
  const fetchHorensoGraph = REQ.requestHorensoGraph(
    baseUrl,
    userMessage,
    sessionId,
    step
  );

  //並行処理
  const tasks: Promise<any>[] = [
    fetchMemory,
    fetchUserprofile,
    fetchHorensoGraph,
  ];
  if (options.memoryOn) {
    tasks.push(fetchSave);
  }
  const [memory, userprofile, horensoGraph] = await Promise.all(tasks);

  contexts.push(horensoGraph.text);

  return {
    contexts: contexts,
    memory: memory,
    userprofile: userprofile,
    horensoGraph: horensoGraph,
  };
}

async function endHorensoWork(state: typeof StateAnnotation.State) {
  console.log("🛎 終了判定ノード");
  const horensoGraph = state.horensoGraph;
  const contexts = state.contexts;

  // ログ表示
  console.log(
    "継続判定 api側: " + horensoGraph.contenue + " chat側: " + horensoContenue
  );
  if (horensoGraph.contenue != horensoContenue) {
    horensoContenue = false;
    contexts.push(MSG.FINISH_MESSAGE);
  }

  return { contexts: contexts };
}

/** 研修終了ノード */
async function finalization() {
  console.log("🚪終了ノード");

  return;
}

/** コンテキストをまとめるノード */
async function contextMerger(state: typeof StateAnnotation.State) {
  console.log("📄 コンテキストノード");
  const memory = state.memory;
  const userprofile = state.userprofile;
  const userMessage = state.userMessage;
  const contexts = state.contexts;

  // ユーザー情報を整形
  const excludeValues = ["", "none", "other"]; // 除外条件
  const userprofileFiltered = Object.entries(userprofile)
    .filter(([_, v]) => !excludeValues.includes(v))
    .map(([k, v]) => `${k}: ${v}`);

  const chatGraphResult: TYPE.ChatGraphResult = {
    memory: memory.join(", "),
    userprofile: userprofileFiltered.join(", "),
    userMessage: userMessage,
    context: contexts.join("\n\n"),
  };

  return { chatGraphResult: chatGraphResult };
}

/** メイングラフ内の状態を司るアノテーション */
const StateAnnotation = Annotation.Root({
  sessionId: Annotation<string>(), // フロントで管理しているセッションID
  userMessage: Annotation<string>(), // 最新のユーザーメッセージ
  baseUrl: Annotation<string>(), // ベースURL
  options: Annotation<SCM.ChatRequestOptions>(), // フロントから送られてきたオプション
  contexts: Annotation<string[]>(), // グラフ内でコンテキストを管理する
  memory: Annotation<string[]>(), // 会話履歴
  userprofile: Annotation<SCM.userprofileFormValues>(), // 取得したユーザープロファイル
  horensoGraph: Annotation<TYPE.HorensoWorkResponse>(), // グラフで取得した結果
  chatGraphResult: Annotation<TYPE.ChatGraphResult>(), // 最終結果

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
  .addNode("endHorensoWork", endHorensoWork)
  .addNode("finalization", finalization)
  .addNode("contextMerger", contextMerger)
  // エッジ
  .addConditionalEdges("__start__", phaseRouter)
  .addEdge("init", "contextMerger")
  .addEdge("horensoWork", "endHorensoWork")
  .addEdge("endHorensoWork", "contextMerger")
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
    const { baseUrl } = getBaseUrl(req);
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
    // フロントからオプションを取得
    const options = SCM.ChatRequestOptionsSchema.parse(body.options);

    // langgraph
    const result = await measureExecution(app, "chat", {
      messages: messages,
      sessionId: sessionId,
      userMessage: userMessage,
      baseUrl: baseUrl,
      options: options,
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
    const clueId = result.horensoGraph?.clueId ?? "";

    // ストリーミング応答を取得
    const stream = await runWithFallback(prompt, promptVariables, {
      mode: "stream",
      onStreamEnd: async (response: string) => {
        // assistant メッセージ保存
        await REQ.requestSave(baseUrl, messages, sessionId);

        // 今回のエントリーにメッセージを追記
        if (!(clueId === "")) await updateClueChat(clueId, response);
      },
    });

    const baseResponse = LangChainAdapter.toDataStreamResponse(stream);

    return new Response(baseResponse.body, {
      status: baseResponse.status,
      statusText: baseResponse.statusText,
      headers: {
        ...Object.fromEntries(baseResponse.headers),
        "x-clue-id": clueId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("💬 chat API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
