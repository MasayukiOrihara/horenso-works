import { Document } from "langchain/document";
import { Annotation, StateGraph } from "@langchain/langgraph";

import {
  HorensoMetadata,
  MatchAnswerArgs,
  SemanticAnswerEntry,
} from "@/lib/type";
import { MESSAGES_ERROR, UNKNOWN_ERROR } from "@/lib/message/error";
import { measureExecution } from "@/lib/llm/graph";
import { cachedVectorStore } from "./vectorStore";
import { DocumentInterface } from "@langchain/core/documents";
import * as SEM from "./semantic";
import { semanticFilePath } from "@/lib/path";
import { embeddings } from "@/lib/llm/models";

// 定数
const BASE_MATCH_SCORE = 0.78; // 基準値
const BASE_WORST_SCORE = 0.3;
const BAD_MATCH_SCORE = 0.82; // 外れ基準値
const SEMANTIC_MATCH_SCORE = 0.82; // 曖昧基準値

// 型
// 最終評価
export type Evaluation = {
  input: UserAnswerEmbedding; // 入力
  document: Document<HorensoMetadata>; // 照合対象
  documentScore: DocumentScore; // ドキュメント正答の結果
  badScore?: FuzzyScore; // 外れリストの結果
  fuzzyScore?: FuzzyScore; // あいまい正答の結果
  answerCorrect: AnswerCorrect; // 最終結果
};
// 入力
export type UserAnswerEmbedding = {
  userAnswer: string; // ユーザーの答え
  embedding: number[]; // ベクターデータ
};
// ドキュメント正答
type DocumentScore = {
  id: string;
  score: number; // 類似性スコア
  correct: AnswerCorrect; // 正解判定
};
// あいまい正答
export type FuzzyScore = {
  id: string;
  score: number; // 類似性スコア
  nearAnswer?: string; // 類似した答え
  reason?: string; // このスコアになった理由
  correct: AnswerCorrect; // 正解判定
};
// 正解判定
type AnswerCorrect = "correct" | "incorrect" | "unknown";

/**
 * langGraphのノード群
 */
/** オブジェクトの準備を行うノード */
async function similarityUserAnswer(state: typeof StateAnnotation.State) {
  // 変数を取得
  const documents = state.matchAnswerArgs.documents;
  const userAnswer = state.matchAnswerArgs.userAnswer;
  const topK = state.matchAnswerArgs.topK;

  // ベクトルストア準備と変換
  const [vectorStore, embedding] = await Promise.all([
    cachedVectorStore(documents),
    embeddings.embedQuery(userAnswer),
  ]);
  // 値の準備
  const userEmbedding: UserAnswerEmbedding = {
    userAnswer: userAnswer,
    embedding: embedding,
  };
  // ベクトルストア内のドキュメントとユーザーの答えを比較
  const results = await vectorStore.similaritySearchVectorWithScore(
    userEmbedding.embedding,
    topK
  );

  return {
    similarityResults: results,
    userEmbedding: userEmbedding,
    didEvaluateAnswer: false, // 初期化
  };
}

/** ドキュメントの答えを比較するノード */
async function checkDocumentScore(state: typeof StateAnnotation.State) {
  const similarityResults = state.similarityResults;
  const documents = state.matchAnswerArgs.documents;
  const userEmbedding = state.userEmbedding;

  // 評価結果オブジェクト
  const evaluationRecords: Evaluation[] = [];

  // スコアが閾値以上の場合3つのそれぞれのフラグを上げる(閾値スコアは固定で良い気がする)
  similarityResults.forEach(([bestMatch, score]) => {
    const bestDocument = bestMatch as Document<HorensoMetadata>;
    console.log("score: " + score + ", match: " + bestDocument.pageContent);

    for (const doc of documents) {
      if (bestDocument.pageContent === doc.pageContent) {
        const bestParentId = bestDocument.metadata.parentId;

        // ✅ 結果の作成
        const documentScore: DocumentScore = {
          id: bestParentId,
          score: score,
          correct: "unknown",
        };

        // 不正解判定
        if (score < BASE_WORST_SCORE) {
          documentScore.correct = "incorrect";
        }

        // 正解判定
        if (score >= BASE_MATCH_SCORE) {
          // 正解ののフラグ上げる
          doc.metadata.isMatched = true;

          // 評価を正解に変更
          documentScore.correct = "correct";

          console.log(" → " + doc.metadata.isMatched);
        }
        // ✅ 評価を作成
        const evaluation: Evaluation = {
          input: userEmbedding,
          document: bestDocument,
          documentScore: documentScore,
          answerCorrect: documentScore.correct,
        };
        evaluationRecords.push(evaluation);
      }
    }
  });

  // 値を更新
  const matchAnswerArgs = {
    ...state.matchAnswerArgs,
    documents: documents,
  };

  return {
    matchAnswerArgs: matchAnswerArgs,
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
  if (hasCorrect || hasIncorrect) {
    // ログ出力
    console.log(
      `☑ ドキュメントチェック hasCorrect: ${hasCorrect}  hasIncoreect: ${hasIncorrect}`
    );
    return "finish";
  }

  return "badMatch";
}

/** ハズレチェックを行うノード */
async function checkBadMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;
  const notCorrectList = state.matchAnswerArgs.notCorrectList;

  // 外れリストを参照する逆パターンを作成しもし一致したらこれ以降の処理を飛ばす
  try {
    await Promise.all(
      evaluationRecords.map(async (record) => {
        const bestDocument = record.document as Document<HorensoMetadata>;
        const input = record.input;

        // ※※ 読み込みを逐一やってるっぽいんでDBに伴い早くなりそう？userAnserじゃなくて埋め込んだやつを直接使ってもいいかも
        const badScore = await SEM.getMaxScoreSemanticMatch(
          input,
          bestDocument,
          notCorrectList
        );
        if (!badScore) throw new Error("スコアの取得に失敗しました");
        record.badScore = badScore;
      })
    );

    // まとめてチェック
    evaluationRecords.map(async (record) => {
      const badScore = record.badScore;
      if (badScore) {
        // 答えの結果が出てない
        const isAnswerUnknown = record.answerCorrect === "unknown";
        // ハズレリストの閾値以上
        const exceedsBadMatchThreshold = badScore.score > BAD_MATCH_SCORE;
        if (isAnswerUnknown && exceedsBadMatchThreshold) {
          badScore.correct = "incorrect"; // 不正解
          record.answerCorrect = badScore.correct;
        }
      }
    });
  } catch (error) {
    console.warn("ハズレチェック中にエラーが発生しました。: " + error);
  }

  return { evaluationRecords: evaluationRecords };
}

/** あいまいチェックに進むか判断するノード */
async function shouldSemanticMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;

  // ひとつでもがあった場合不正解
  const hasIncorrect = evaluationRecords.some(
    (item) => item.answerCorrect === "incorrect"
  );
  if (hasIncorrect) {
    // ログ出力
    console.log(
      `ハズレチェック（${evaluationRecords[0].input.userAnswer}）: ${hasIncorrect}`
    );
    return "finish";
  }

  return "semantic";
}

/** あいまい正答チェックを行うノード */
// ※※ この辺の処理まとめられそう
async function checkSemanticMatch(state: typeof StateAnnotation.State) {
  const evaluationRecords = state.evaluationRecords;
  const semanticList = state.matchAnswerArgs.semanticList;

  // 曖昧リストから検索し最大値スコアを取得
  try {
    await Promise.all(
      evaluationRecords.map(async (record) => {
        const bestDocument = record.document as Document<HorensoMetadata>;
        const input = record.input;

        const match = await SEM.getMaxScoreSemanticMatch(
          input,
          bestDocument,
          semanticList
        );
        if (!match) throw new Error("スコアの取得に失敗しました");
        console.log(`曖昧結果 ID: ${match.id} score: ${match.score}`);
        record.fuzzyScore = match;
      })
    );

    // まとめてチェック
    evaluationRecords.map(async (record) => {
      const fuzzyScore = record.fuzzyScore;
      if (fuzzyScore) {
        // 答えの結果が出てない
        const isAnswerUnknown = record.answerCorrect === "unknown";
        // あいまいの閾値以上
        const exceedsfuzzyThreshold = fuzzyScore.score > SEMANTIC_MATCH_SCORE;
        if (isAnswerUnknown && exceedsfuzzyThreshold) {
          fuzzyScore.correct = "correct"; // 正解
          record.answerCorrect = fuzzyScore.correct;
        }
      }
    });
  } catch (error) {
    console.warn("あいまい検索中にエラーが発生しました。: " + error);
  }

  return { evaluationRecords: evaluationRecords };
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
    console.log(
      `☑ あいまいチェック（${evaluationRecords[0].input.userAnswer}）: ${hasCorrect}`
    );
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
        console.log("適正あり");
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

  console.log(topRecord);

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
    const evaluationData = result.evaluationData;
    return Response.json({ evaluationData }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("🥬 match API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
