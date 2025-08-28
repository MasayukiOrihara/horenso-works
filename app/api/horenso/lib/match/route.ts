import { Document } from "langchain/document";
import { Annotation, StateGraph } from "@langchain/langgraph";

import {
  DocumentScore,
  Evaluation,
  FuzzyScore,
  HorensoMetadata,
  MatchAnswerArgs,
  SemanticAnswerEntry,
  UserAnswerEmbedding,
} from "@/lib/type";
import { MESSAGES_ERROR, UNKNOWN_ERROR } from "@/lib/message/error";
import { measureExecution } from "@/lib/llm/graph";
import { cachedVectorStore } from "./lib/vectorStore";
import { DocumentInterface } from "@langchain/core/documents";
import * as SEM from "./lib/semantic";
import { semanticFilePath } from "@/lib/path";
import { embeddings } from "@/lib/llm/models";
import * as NODE from "./node";

// 定数
const BASE_MATCH_SCORE = 0.78; // 基準値
const BASE_WORST_SCORE = 0.3;
const BAD_MATCH_SCORE = 0.82; // 外れ基準値
const SEMANTIC_MATCH_SCORE = 0.82; // 曖昧基準値

/**
 * langGraphのノード群
 */
/** オブジェクトの準備を行うノード */
async function similarityUserAnswer(state: typeof StateAnnotation.State) {
  // 変数を取得
  const documents = state.matchAnswerArgs.documents;
  const userAnswer = state.matchAnswerArgs.userAnswer;
  const topK = state.matchAnswerArgs.topK;

  const { similarityResults, userEmbedding } =
    await NODE.similarityUserAnswerNode({
      documents: documents,
      userAnswer: userAnswer,
      topK: topK,
    });

  return {
    similarityResults: similarityResults,
    userEmbedding: userEmbedding,
    didEvaluateAnswer: false, // 初期化
  };
}

/** ドキュメントの答えを比較するノード */
async function checkDocumentScore(state: typeof StateAnnotation.State) {
  const similarityResults = state.similarityResults;
  const matchAnswerArgs = state.matchAnswerArgs;
  const userEmbedding = state.userEmbedding;

  const { tempMatchAnswerArgs, evaluationRecords } =
    await NODE.checkDocumentScoreNode({
      similarityResults: similarityResults,
      matchAnswerArgs: matchAnswerArgs,
      userEmbedding: userEmbedding,
    });

  return {
    matchAnswerArgs: tempMatchAnswerArgs,
    evaluationRecords: evaluationRecords,
  };
}

/** ハズレチェックに進むかどうかを判断するノード */
async function shouldBadMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  // 1つでも正解があった場合
  const hasCorrect = evaluationRecords.some(
    (item) => item.answerCorrect === "correct"
  );
  // すべて不正解
  const hasIncorrect = evaluationRecords.every(
    (item) => item.answerCorrect === "incorrect"
  );
  // ログ出力
  console.log(`☑ ドキュメント 正: ${hasCorrect}  誤: ${hasIncorrect}`);
  if (hasCorrect || hasIncorrect) {
    return "finish";
  }

  return "badMatch";
}

/** ハズレチェックを行うノード */
async function checkBadMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  const { tempEvaluationRecords } = await NODE.checkBadMatchNode({
    evaluationRecords: evaluationRecords,
  });

  return { evaluationRecords: tempEvaluationRecords };
}

/** あいまいチェックに進むか判断するノード */
async function shouldSemanticMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  // ひとつでもがあった場合不正解
  const hasIncorrect = evaluationRecords.some(
    (item) => item.answerCorrect === "incorrect"
  );
  // ログ出力
  const answer = evaluationRecords[0].input.userAnswer;
  console.log(`☑ ハズレ【ワード: ${answer}】   誤: ${hasIncorrect}`);
  if (hasIncorrect) {
    return "finish";
  }

  return "semantic";
}

/** あいまい正答チェックを行うノード */
async function checkSemanticMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  const { tempEvaluationRecords } = await NODE.checkSemanticMatchNode({
    evaluationRecords: evaluationRecords,
  });

  return { evaluationRecords: tempEvaluationRecords };
}

/** AI回答判断に進むかどうかのノード */
async function shouldEvaluateAnswer(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;
  const shouldValidate = state.matchAnswerArgs.shouldValidate;
  const didEvaluateAnswer = state.didEvaluateAnswer;

  // AI による解答適正チェックには進まず更新ノードへ
  const hasCorrect = evaluationRecords.some(
    (item) => item.answerCorrect === "correct"
  );
  if (hasCorrect) {
    const answer = evaluationRecords[0].input.userAnswer;
    console.log(`☑ あいまいチェック（${answer}）: ${hasCorrect}`);
    return "update";
  }

  // AI による解答適正チェックがオフになってる場合もしくはすでにチェック済みの場合終了
  if (!shouldValidate || didEvaluateAnswer) {
    return "finish";
  }

  // AI チェックへ
  return "evaluate";
}

/** AI による回答判定ノード */
async function evaluateAnswer(state: typeof StateAnnotation.State) {
  console.log("☑ 回答判定ノード");
  const evaluationRecords = state.evaluationRecords;
  const documents = state.matchAnswerArgs.documents;
  const semanticList = state.matchAnswerArgs.semanticList;
  const semanticPath = semanticFilePath();

  // AI による判定
  let evaluate: SemanticAnswerEntry | null = null;
  try {
    const userAnswer = evaluationRecords[0].input.userAnswer;
    evaluate = await SEM.judgeSemanticMatch(userAnswer, documents);
  } catch (error) {
    console.warn("AI のよる判定結果が得られませんでした" + error);
    return { didEvaluateAnswer: true };
  }

  // 判定結果を取得
  if (evaluate) {
    evaluationRecords.map(async (record) => {
      const bestDocument = record.document as Document<HorensoMetadata>;

      // 比較対象回答と一致しているかの確認
      const evaluateParentId = String(evaluate.metadata.parentId);
      const checkIdMatch = evaluateParentId === bestDocument.metadata.parentId;
      // 判定OK
      if (evaluate && checkIdMatch) {
        // jsonの更新
        SEM.updateSemanticMatch(
          evaluate,
          semanticList,
          semanticPath,
          bestDocument.metadata.question_id
        );

        // オブジェクトの更新
        const fuzzyScore: FuzzyScore = {
          id: evaluate.id,
          score: 1,
          reason: evaluate.reason,
          correct: "correct",
        };
        record.fuzzyScore = fuzzyScore;
        record.answerCorrect = "correct";
      }
    });
  }

  return { evaluationRecords: evaluationRecords, didEvaluateAnswer: true };
}

async function updateSemanticMatchFlags(state: typeof StateAnnotation.State) {
  console.log("◌ 状態更新ノード");
  const evaluationRecords = state.evaluationRecords;
  const documents = state.matchAnswerArgs.documents;

  // あいまい検索の結果正解だった場合の更新
  evaluationRecords.map(async (record) => {
    const bestDocument = record.document as Document<HorensoMetadata>;
    const parentId = bestDocument.metadata.parentId;

    // ドキュメントの正解判定を更新
    documents.forEach((d) => {
      const docParentId = d.metadata.parentId;
      if (docParentId === parentId) {
        d.metadata.isMatched = true;
      }
    });
  });

  // 値を更新
  const matchAnswerArgs = {
    ...state.matchAnswerArgs,
    documents: documents,
  };

  return { matchAnswerArgs: matchAnswerArgs };
}

async function finishState(state: typeof StateAnnotation.State) {
  console.log("◍ 状態保存ノード");
  const evaluationRecords = state.evaluationRecords;

  // 中身型チェック
  const allHaveFuzzyScore = evaluationRecords.every(
    (r) => typeof r.fuzzyScore?.score === "number"
  );
  const allHaveBadScore = evaluationRecords.every(
    (r) => typeof r.badScore?.score === "number"
  );
  if (allHaveFuzzyScore) {
    evaluationRecords.sort((a, b) => b.fuzzyScore!.score - a.fuzzyScore!.score);
  } else if (allHaveBadScore) {
    evaluationRecords.sort((a, b) => b.badScore!.score - a.badScore!.score);
  } else {
    evaluationRecords.sort(
      (a, b) => b.documentScore.score - a.documentScore.score
    );
  }
  // 一番目の要素
  const topRecord = evaluationRecords[0];

  return { evaluationData: topRecord };
}

const StateAnnotation = Annotation.Root({
  matchAnswerArgs: Annotation<MatchAnswerArgs>(),
  userEmbedding: Annotation<UserAnswerEmbedding>(),
  similarityResults:
    Annotation<[DocumentInterface<Record<string, unknown>>, number][]>(),
  didEvaluateAnswer: Annotation<boolean>(),
  evaluationRecords: Annotation<Evaluation[]>(),
  evaluationData: Annotation<Evaluation>(),
});

/**
 * グラフ定義
 * messages: 今までのメッセージを保存しているもの
 */
const workflow = new StateGraph(StateAnnotation)
  // ノード
  .addNode("similarity", similarityUserAnswer)
  .addNode("docScore", checkDocumentScore)
  .addNode("badMatch", checkBadMatch)
  .addNode("semantic", checkSemanticMatch)
  .addNode("evaluate", evaluateAnswer)
  .addNode("update", updateSemanticMatchFlags)
  .addNode("finish", finishState)
  // エッジ
  .addEdge("__start__", "similarity")
  .addEdge("similarity", "docScore")
  .addConditionalEdges("docScore", shouldBadMatch)
  .addConditionalEdges("badMatch", shouldSemanticMatch)
  .addConditionalEdges("semantic", shouldEvaluateAnswer)
  .addConditionalEdges("evaluate", shouldEvaluateAnswer)
  .addEdge("update", "finish")
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

    // 出力
    // 回答評価データ
    const evaluationData = result.evaluationData;
    return Response.json({ evaluationData }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("🥬 match API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
