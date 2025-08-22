import { Document } from "langchain/document";
import { Annotation, MemorySaver, StateGraph } from "@langchain/langgraph";

import { HorensoMetadata, MatchAnswerArgs, UsedEntry } from "@/lib/type";
import {
  MESSAGES_ERROR,
  SESSIONID_ERROR,
  UNKNOWN_ERROR,
} from "@/lib/message/error";
import { measureExecution } from "@/lib/llm/graph";
import { requestApi } from "@/lib/api/request";
import { USER_ANSWER_DATA_PATH } from "@/lib/api/path";
import { cachedVectorStore } from "./vectorStore";
import { DocumentInterface } from "@langchain/core/documents";
import { getMaxScoreSemanticMatch } from "./semantic";

// 定数
const BASE_MATCH_SCORE = 0.78; // 基準値
const BAD_MATCH_SCORE = 0.82; // 外れ基準値

type AnswerCorrent = {
  isAnswerCorrect: boolean;
  saveAnswerCorrect: boolean;
};

/**
 * langGraphのノード群
 */
async function similarityUserAnswer(state: typeof StateAnnotation.State) {
  console.log("📝 比較ノード");
  // 変数を取得
  const documents = state.matchAnswerArgs.documents;
  const userAnswer = state.matchAnswerArgs.userAnswer;
  const topK = state.matchAnswerArgs.topK;

  // ベクトルストア準備
  const vectorStore = await cachedVectorStore(documents);

  // ベクトルストア内のドキュメントとユーザーの答えを比較
  const results = await vectorStore.similaritySearchWithScore(userAnswer, topK);

  return { similarityResults: results };
}

async function checkDocumentScore(state: typeof StateAnnotation.State) {
  console.log("☑ ドキュメントチェック");
  const similarityResults = state.similarityResults;
  const documents = state.matchAnswerArgs.documents;

  // 正解フラグ
  let isAnswerCorrect = false;
  let saveAnswerCorrect = false;

  // スコアが閾値以上の場合3つのそれぞれのフラグを上げる(閾値スコアは固定で良い気がする)
  for (const [bestMatch, score] of similarityResults) {
    const bestDocument = bestMatch as Document<HorensoMetadata>;
    console.log("score: " + score + ", match: " + bestDocument.pageContent);

    if (score >= BASE_MATCH_SCORE) {
      for (const doc of documents) {
        if (bestDocument.pageContent === doc.pageContent) {
          // 同じparentIdのフラグ上げる
          const bestParentId = bestDocument.metadata.parentId;
          documents.map((d) => {
            const parentId = d.metadata.parentId;
            if (bestParentId === parentId) d.metadata.isMatched = true;
          });
          isAnswerCorrect = true;

          console.log(
            bestDocument.pageContent + " : " + doc.metadata.isMatched
          );
        }
      }
      saveAnswerCorrect = true;
    }
  }

  // 値を入れる
  const matchAnswerArgs = {
    ...state.matchAnswerArgs,
    documents: documents,
  };
  const answerCorrect: AnswerCorrent = {
    isAnswerCorrect: isAnswerCorrect,
    saveAnswerCorrect: saveAnswerCorrect,
  };

  return { matchAnswerArgs: matchAnswerArgs, answerCorrect: answerCorrect };
}

async function checkBadMatch(state: typeof StateAnnotation.State) {
  console.log("☑ ハズレチェック");
  const similarityResults = state.similarityResults;
  const notCorrectList = state.matchAnswerArgs.notCorrectList;
  const userAnswer = state.matchAnswerArgs.userAnswer;

  // 外れリストを参照する逆パターンを作成しもし一致したらこれ以降の処理を飛ばす
  const results = await Promise.all(
    similarityResults.map(async ([bestMatch, _]) => {
      const bestDocument = bestMatch as Document<HorensoMetadata>;
      // ※※ 読み込みを逐一やってるっぽいんでDBに伴い早くなりそう？userAnserじゃなくて埋め込んだやつを直接使ってもいいかも
      const { score: worstScore } = await getMaxScoreSemanticMatch(
        bestDocument,
        notCorrectList,
        userAnswer
      );
      return { worstScore, bestDocument };
    })
  );

  // まとめてチェック
  for (const { worstScore } of results) {
    if (worstScore > BAD_MATCH_SCORE) {
      console.log("worstScore: " + worstScore);
      return "finish";
    }
  }

  return "finish";
}

async function rerank(state: typeof StateAnnotation.State) {
  console.log("👓 過去返答検索ノード");
}

async function generateHint(state: typeof StateAnnotation.State) {
  console.log("🛎 ヒント生成ノード");
}

async function askQuestion(state: typeof StateAnnotation.State) {
  console.log("❓ 問題出題ノード");
}

async function explainAnswer(state: typeof StateAnnotation.State) {
  console.log("📢 解答解説ノード");
}

async function finishState(state: typeof StateAnnotation.State) {
  console.log("💾 状態保存ノード");
}

export const StateAnnotation = Annotation.Root({
  matchAnswerArgs: Annotation<MatchAnswerArgs>(),
  similarityResults:
    Annotation<[DocumentInterface<Record<string, any>>, number][]>(),
  answerCorrent: Annotation<AnswerCorrent>(),
});

/**
 * グラフ定義
 * messages: 今までのメッセージを保存しているもの
 */
const workflow = new StateGraph(StateAnnotation)
  // ノード
  .addNode("similarity", similarityUserAnswer)
  .addNode("docScore", checkDocumentScore)
  .addNode("finish", finishState)
  // エッジ
  .addEdge("__start__", "similarity")
  .addEdge("similarity", "docScore")
  .addConditionalEdges("docScore", checkBadMatch)

  // .addConditionalEdges("check", (state) =>
  //   state.transition.isAnswerCorrect ? "explain" : "rerank"
  // )
  // .addEdge("rerank", "hint")
  // .addEdge("hint", "ask")
  // .addConditionalEdges("explain", (state) =>
  //   state.transition.hasQuestion ? "ask" : "save"
  // )
  // .addEdge("ask", "save")
  .addEdge("finish", "__end__");

const app = workflow.compile();

/**
 * マッチング API
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 判断材料を取得
    const matchAnswerArgs: MatchAnswerArgs = body.matchAnswerArgs;
    if (!matchAnswerArgs) {
      console.error("🥬 match API POST error: " + MESSAGES_ERROR);
      return Response.json({ error: MESSAGES_ERROR }, { status: 400 });
    }

    // 実行
    const result = await measureExecution(app, "match", { matchAnswerArgs });

    return Response.json("", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("🥬 match API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
