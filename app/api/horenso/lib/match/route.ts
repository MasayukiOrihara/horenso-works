import { Document } from "langchain/document";
import { Annotation, MemorySaver, StateGraph } from "@langchain/langgraph";

import {
  HorensoMetadata,
  MatchAnswerArgs,
  SemanticAnswerEntry,
  UsedEntry,
  UserAnswerEvaluation,
} from "@/lib/type";
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
import * as SEM from "./semantic";
import { semanticFilePath } from "@/lib/path";
import { embeddings } from "@/lib/llm/models";

// 定数
const BASE_MATCH_SCORE = 0.78; // 基準値
const BASE_WORST_SCORE = 0.3;
const BAD_MATCH_SCORE = 0.82; // 外れ基準値
const SEMANTIC_MATCH_SCORE = 0.82; // 曖昧基準値

// 型
/** ユーザーの回答データを管理する型 */
/*
export type UserAnswerEvaluation = {
  parentId: string;
  question_id: string; // 問題番号
  userAnswer: string; // ユーザーの答え
  currentAnswer: string; // 正答
  score: string; // 類似性のスコア
  semanticId?: string; // あいまい正解リストでのID
  semanticReason?: string; // あいまい正解リストでの理由
  isAnswerCorrect: boolean; // 正解だったかどうか
};*/
// 最終評価
type Evaluation = {
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

// セマンティック検索結果※※　削除予定
export type SemanticMatchScore = {
  id: string | null;
  parentId?: string;
  score: number;
  reason?: string;
  isAnswerCorrect: boolean;
};

/**
 * langGraphのノード群
 */
async function similarityUserAnswer(state: typeof StateAnnotation.State) {
  console.log("📝 準備ノード");
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

  // スコア初期化　※※　削除予定
  let semanticMatchScore: SemanticMatchScore[] = Array.from(
    { length: topK },
    () => ({ id: null, score: 0, isAnswerCorrect: false })
  );

  return {
    similarityResults: results,
    userEmbedding: userEmbedding,
    semanticMatchScore: semanticMatchScore,
    isAnswerIncorrect: false, // 初期化※※　削除予定
    didEvaluateAnswer: false, // 初期化
  };
}

async function checkDocumentScore(state: typeof StateAnnotation.State) {
  console.log("☑ ドキュメントチェック");
  const similarityResults = state.similarityResults;
  const documents = state.matchAnswerArgs.documents;
  const semanticMatchScore = state.semanticMatchScore; // ※※　削除予定
  const userEmbedding = state.userEmbedding;

  // 評価結果オブジェクト
  const evaluationRecords: Evaluation[] = [];

  // スコアが閾値以上の場合3つのそれぞれのフラグを上げる(閾値スコアは固定で良い気がする)
  similarityResults.forEach(([bestMatch, score], index) => {
    const bestDocument = bestMatch as Document<HorensoMetadata>;
    console.log("score: " + score + ", match: " + bestDocument.pageContent);

    for (const doc of documents) {
      if (bestDocument.pageContent === doc.pageContent) {
        const bestParentId = bestDocument.metadata.parentId;

        // 値を保持※※　削除予定
        semanticMatchScore[index] = {
          ...semanticMatchScore[index], // 既存の値を残す
          parentId: bestParentId,
          score: score,
        };
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

          // ※※　削除予定
          semanticMatchScore[index] = {
            ...semanticMatchScore[index], // 既存の値を残す
            isAnswerCorrect: true,
          };
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

  console.log(evaluationRecords);
  return {
    matchAnswerArgs: matchAnswerArgs,
    semanticMatchScore: semanticMatchScore, // 削除予定
    evaluationRecords: evaluationRecords,
  };
}

async function shouldBadMatch(state: typeof StateAnnotation.State) {
  // ハズレチェックが必要かどうか
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
    console.log(`hasCorrect: ${hasCorrect}  hasIncoreect: ${hasIncorrect}`);
    return "finish";
  }

  return "badMatch";
}

async function checkBadMatch(state: typeof StateAnnotation.State) {
  console.log("☑ ハズレチェック");
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
        if (badScore) record.badScore = badScore;
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
          console.log(
            `${record.input.userAnswer} worstScore: ${badScore.score}`
          );
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

async function shouldSemanticMatch(state: typeof StateAnnotation.State) {
  // セマンティック検索が必要かどうか
  const evaluationRecords = state.evaluationRecords;

  // ひとつでもがあった場合不正解
  const hasIncorrect = evaluationRecords.every(
    (item) => item.answerCorrect === "incorrect"
  );
  if (hasIncorrect) {
    return "finish";
  }

  return "semantic";
}

async function checkSemanticMatch(state: typeof StateAnnotation.State) {
  console.log("👓 あいまい検索ノード");
  const similarityResults = state.similarityResults;
  const semanticList = state.matchAnswerArgs.semanticList;
  const userAnswer = state.matchAnswerArgs.userAnswer;
  const semanticMatchScore = state.semanticMatchScore;

  const evaluationRecords = state.evaluationRecords;

  // 曖昧リストから検索し最大値スコアを取得
  try {
    const results = await Promise.all(
      evaluationRecords.map(async (evaluation) => {
        const bestDocument = evaluation.document as Document<HorensoMetadata>;
        const input = evaluation.input;

        const match = await SEM.getMaxScoreSemanticMatch(
          input,
          bestDocument,
          semanticList
        );
        if (!match) throw new Error("スコアの取得に失敗しました");
        console.log(`曖昧結果 ID: ${match.id} score: ${match.score}`);
        return match;
      })
    );

    // まとめてチェック & 値更新
    // for (const result of results) {
    //   for (let i = 0; i < semanticMatchScore.length; i++) {
    //     const semantic = semanticMatchScore[i];
    //     if (result.parentId === semantic.parentId) {
    //       const isScoreAboveThreshold = result.score > SEMANTIC_MATCH_SCORE;
    //       const isScoreAboveMaxScore = result.score > semantic.score;
    //       if (isScoreAboveThreshold && isScoreAboveMaxScore) {
    //         semanticMatchScore[i] = {
    //           ...semantic,
    //           isAnswerCorrect: true,
    //           score: result.score,
    //           reason: result.reason,
    //         };
    //       }
    //     }
    //   }
    // }
  } catch (error) {
    console.warn("あいまい検索中にエラーが発生しました。: " + error);
  }

  return { semanticMatchScore: semanticMatchScore };
}

async function shouldEvaluateAnswer(state: typeof StateAnnotation.State) {
  console.log("🛎 分岐確認ノード");
  const semanticMatchScore = state.semanticMatchScore;
  const shouldValidate = state.matchAnswerArgs.shouldValidate;
  const didEvaluateAnswer = state.didEvaluateAnswer;

  // AI による解答適正チェックには進まず更新ノードへ
  const hasCorrect = semanticMatchScore.some((item) => item.isAnswerCorrect);
  if (hasCorrect) {
    return "update";
  }

  // AI による解答適正チェックがオフになってる場合もしくはすでにチェック済みの場合終了
  if (!shouldValidate || didEvaluateAnswer) {
    return "finish";
  }

  // AI チェックへ
  return "evaluate";
}

async function evaluateAnswer(state: typeof StateAnnotation.State) {
  console.log("☑ 回答判定ノード");
  const similarityResults = state.similarityResults;
  const semanticMatchScore = state.semanticMatchScore;
  const documents = state.matchAnswerArgs.documents;
  const userAnswer = state.matchAnswerArgs.userAnswer;
  const semanticList = state.matchAnswerArgs.semanticList;
  const semanticPath = semanticFilePath();

  // AI による判定
  let evaluate: SemanticAnswerEntry | null = null;
  try {
    evaluate = await SEM.judgeSemanticMatch(userAnswer, documents);
  } catch (error) {
    console.warn("AI のよる判定結果が得られませんでした" + error);
    return { didEvaluateAnswer: true };
  }

  // 判定結果を取得
  if (evaluate) {
    similarityResults.map(async ([bestMatch, _]) => {
      const bestDocument = bestMatch as Document<HorensoMetadata>;

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

        // まとめてチェック & 値更新

        for (let i = 0; i < semanticMatchScore.length; i++) {
          const semantic = semanticMatchScore[i];
          if (evaluateParentId === semantic.parentId) {
            semanticMatchScore[i] = {
              ...semantic,
              id: evaluate.id,
              score: 1,
              reason: evaluate.reason,
              isAnswerCorrect: true,
            };
          }
        }
      }
    });
  }

  return { semanticMatchScore: semanticMatchScore, didEvaluateAnswer: true };
}

async function updateSemanticMatchFlags(state: typeof StateAnnotation.State) {
  console.log("◌ 状態更新ノード");
  const documents = state.matchAnswerArgs.documents;
  const similarityResults = state.similarityResults;

  // あいまい検索の結果正解だった場合の更新
  similarityResults.map(async ([bestMatch, _]) => {
    const bestDocument = bestMatch as Document<HorensoMetadata>;
    const parentId = bestDocument.metadata.parentId;

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
  const similarityResults = state.similarityResults;
  const userAnswer = state.matchAnswerArgs.userAnswer;
  const semanticMatchScore = state.semanticMatchScore;

  const userAnswerDatas: UserAnswerEvaluation[] = [];
  similarityResults.map(async ([bestMatch, score], index) => {
    const bestDocument = bestMatch as Document<HorensoMetadata>;
    // 答えの結果をユーザー回答データとして詰め込む
    const data: UserAnswerEvaluation = {
      parentId: bestDocument.metadata.parentId,
      question_id: bestDocument.metadata.question_id,
      userAnswer: userAnswer,
      currentAnswer: bestDocument.pageContent,
      score: score.toString(),
      semanticId: semanticMatchScore[index].id ?? undefined,
      semanticReason: semanticMatchScore[index].reason,
      isAnswerCorrect: bestDocument.metadata.isMatched,
    };
    userAnswerDatas.push(data);
  });

  console.log(userAnswerDatas);

  return { userAnswerDatas: userAnswerDatas };
}

export const StateAnnotation = Annotation.Root({
  matchAnswerArgs: Annotation<MatchAnswerArgs>(),
  userEmbedding: Annotation<UserAnswerEmbedding>(),
  similarityResults:
    Annotation<[DocumentInterface<Record<string, any>>, number][]>(),
  isAnswerIncorrect: Annotation<boolean>(),
  semanticMatchScore: Annotation<SemanticMatchScore[]>(),
  userAnswerDatas: Annotation<UserAnswerEvaluation[]>(),
  didEvaluateAnswer: Annotation<boolean>(),
  evaluationRecords: Annotation<Evaluation[]>(),
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
    const isAnswerCorrect = result.semanticMatchScore.some(
      (item) => item.isAnswerCorrect
    );
    const userAnswerDatas = result.userAnswerDatas;
    return Response.json({ isAnswerCorrect, userAnswerDatas }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("🥬 match API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
