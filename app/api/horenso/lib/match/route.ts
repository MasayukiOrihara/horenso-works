import { DocumentInterface } from "@langchain/core/documents";
import { Annotation, StateGraph } from "@langchain/langgraph";

import { MESSAGES_ERROR, UNKNOWN_ERROR } from "@/lib/message/error";
import { measureExecution } from "@/lib/llm/graph";

import * as TYPE from "@/lib/type";
import * as NODE from "./node";

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
async function shouldWrongMatch(state: typeof StateAnnotation.State) {
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

  return "wrongMatch";
}

/** ハズレチェックを行うノード */
async function checkWrongMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  const { tempEvaluationRecords } = await NODE.checkWrongMatchNode({
    evaluationRecords: evaluationRecords,
  });

  return { evaluationRecords: tempEvaluationRecords };
}

/** あいまいチェックに進むか判断するノード */
async function shouldFuzzyMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  // ひとつでもがあった場合不正解
  const hasIncorrect = evaluationRecords.some(
    (item) => item.answerCorrect === "incorrect"
  );
  // ログ出力
  const answer = evaluationRecords[0].input.userAnswer;
  console.log(`☑ ハズレ【ワード: ${answer}】  誤: ${hasIncorrect}`);
  if (hasIncorrect) {
    return "finish";
  }

  return "fuzzy";
}

/** あいまい正答チェックを行うノード */
async function checkFuzzyMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  const { tempEvaluationRecords } = await NODE.checkFuzzyMatchNode({
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
  const answer = evaluationRecords[0].input.userAnswer;
  console.log(`☑ あいまい【ワード: ${answer}】  正: ${hasCorrect}`);
  if (hasCorrect) {
    return "update";
  }

  // AI による解答適正チェックがオフになってる場合もしくはすでにチェック済みの場合終了
  console.log(`☑ AI  設定: ${shouldValidate} 済み: ${didEvaluateAnswer}`);
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

  const { tempEvaluationRecords } = await NODE.evaluateAnswerNode({
    evaluationRecords: evaluationRecords,
    documents: documents,
  });

  return { evaluationRecords: tempEvaluationRecords, didEvaluateAnswer: true };
}

/** ドキュメントの正答を更新するノード */
async function updateFuzzyMatchFlags(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;
  const matchAnswerArgs = state.matchAnswerArgs;

  const { tempMatchAnswerArgs, tempEvaluationRecords } =
    await NODE.updateFuzzyMatchFlagsNode({
      evaluationRecords: evaluationRecords,
      matchAnswerArgs: matchAnswerArgs,
    });

  return {
    matchAnswerArgs: tempMatchAnswerArgs,
    evaluationRecords: tempEvaluationRecords,
  };
}

/** 最後にデータを整形して出力するノード */
async function finalizeResult(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  const { topRecord } = await NODE.finalizeResultNode({
    evaluationRecords: evaluationRecords,
  });

  return { evaluationData: topRecord };
}

/** アノテーション一覧 */
const StateAnnotation = Annotation.Root({
  matchAnswerArgs: Annotation<TYPE.MatchAnswerArgs>(),
  userEmbedding: Annotation<TYPE.UserAnswerEmbedding>(),
  similarityResults:
    Annotation<[DocumentInterface<Record<string, unknown>>, number][]>(),
  didEvaluateAnswer: Annotation<boolean>(),
  evaluationRecords: Annotation<TYPE.Evaluation[]>(),
  evaluationData: Annotation<TYPE.Evaluation>(),
});

/**
 * グラフ定義
 * messages: 今までのメッセージを保存しているもの
 */
const workflow = new StateGraph(StateAnnotation)
  // ノード
  .addNode("similarity", similarityUserAnswer)
  .addNode("docScore", checkDocumentScore)
  .addNode("wrongMatch", checkWrongMatch)
  .addNode("fuzzy", checkFuzzyMatch)
  .addNode("evaluate", evaluateAnswer)
  .addNode("update", updateFuzzyMatchFlags)
  .addNode("finish", finalizeResult)
  // エッジ
  .addEdge("__start__", "similarity")
  .addEdge("similarity", "docScore")
  .addConditionalEdges("docScore", shouldWrongMatch)
  .addConditionalEdges("wrongMatch", shouldFuzzyMatch)
  .addConditionalEdges("fuzzy", shouldEvaluateAnswer)
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
    const matchAnswerArgs: TYPE.MatchAnswerArgs = body.matchAnswerArgs;
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
