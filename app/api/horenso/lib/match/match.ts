import { Document } from "langchain/document";

import {
  HorensoMetadata,
  MatchAnswerArgs,
  UserAnswerEvaluation,
} from "@/lib/type";
import * as SEM from "./semantic";
import { cachedVectorStore } from "./vectorStore";
import { semanticFilePath } from "@/lib/path";
import { SemanticMatchScore } from "./route";

// スコアの閾値
const SCORE_BORDER = 0.82;

/** 答えを判定して正解かどうかを返す関数（openAIのembeddingsを使用） */
export async function matchAnswerOpenAi({
  userAnswer,
  documents,
  topK,
  allTrue = false,
  shouldValidate = true,
  semanticList,
  notCorrectList,
}: MatchAnswerArgs) {
  let isAnswerCorrect = false;
  let saveAnswerCorrect = false;
  const userAnswerDatas: UserAnswerEvaluation[] = [];
  const semanticPath = semanticFilePath();

  // ベクトルストア準備
  const vectorStore = await cachedVectorStore(documents);
  // ベクトルストア内のドキュメントとユーザーの答えを比較
  const similarityResults = await vectorStore.similaritySearchWithScore(
    userAnswer,
    topK
  );
  for (const [bestMatch, score] of similarityResults) {
    const bestDocument = bestMatch as Document<HorensoMetadata>;
    console.log("score: " + score + ", match: " + bestDocument.pageContent);

    // スコアが閾値以上の場合3つのそれぞれのフラグを上げる(閾値スコアは固定で良い気がする)
    let semanticId: string = "";
    let semanticReason = "";
    if (score >= 0.78) {
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
    } else {
      // 曖昧マッチングを行う
      const parentId = bestDocument.metadata.parentId;
      // 外れリストを参照する逆パターンを作成しもし一致したらこれ以降の処理を飛ばす
      const semanticMatchBadScore: SemanticMatchScore =
        await SEM.getMaxScoreSemanticMatch(
          bestDocument,
          notCorrectList,
          userAnswer
        );
      if (semanticMatchBadScore.score > SCORE_BORDER) {
        console.log("worstScore: " + semanticMatchBadScore.score);
      } else {
        // 曖昧リストから検索し最大値スコアを取得
        const semanticMatchScore = await SEM.getMaxScoreSemanticMatch(
          bestDocument,
          semanticList,
          userAnswer
        );
        console.log("曖昧結果: " + semanticMatchScore.score);

        if (semanticMatchScore.score > SCORE_BORDER) {
          documents.forEach((d) => {
            const docParentId = d.metadata.parentId;

            if (semanticMatchScore.id != null && docParentId === parentId) {
              d.metadata.isMatched = true;
              isAnswerCorrect = true;
              saveAnswerCorrect = true;
              semanticId = semanticMatchScore.id;
              semanticReason = semanticMatchScore.reason ?? "";
            }
          });
        } else {
          if (shouldValidate) {
            // スコアが下回った場合、調べる
            console.log("解答適正チェック");
            const semanticJudge = await SEM.judgeSemanticMatch(
              userAnswer,
              documents
            );
            console.log(semanticJudge);
            console.log(bestDocument);

            // 比較対象回答と一致しているかの確認
            const checkIdMatch =
              String(semanticJudge.metadata.parentId) ===
              bestDocument.metadata.parentId;
            if (semanticJudge && checkIdMatch) {
              console.log("適正あり");
              // jsonの更新
              const updated = SEM.updateSemanticMatch(
                semanticJudge,
                semanticList,
                semanticPath,
                bestDocument.metadata.question_id
              );
              // 更新された場合正解とする
              if (updated) {
                documents.forEach((d) => {
                  const docParentId = d.metadata.parentId;
                  if (docParentId === parentId) {
                    d.metadata.isMatched = true;
                    isAnswerCorrect = true;
                    saveAnswerCorrect = true;
                    semanticId = semanticJudge.id;
                    semanticReason = semanticJudge.reason ?? "";
                  }
                });
              }
            }
          }
        }
      }
    }
    // 答えの結果をユーザー回答データとして詰め込む
    const data: UserAnswerEvaluation = {
      parentId: bestDocument.metadata.parentId,
      question_id: bestDocument.metadata.question_id,
      userAnswer: userAnswer,
      currentAnswer: bestDocument.pageContent,
      score: score.toString(),
      semanticId: semanticId,
      semanticReason: semanticReason,
      isAnswerCorrect: saveAnswerCorrect,
    };
    userAnswerDatas.push(data);

    // 結果をログへ
    console.log(
      `対象回答: "${bestDocument.pageContent}" 対象回答は正解済みか: "${bestDocument.metadata.isMatched}"`
    );
    console.log(
      `ユーザー回答: "${data.userAnswer}" この回答は正解か: "${data.isAnswerCorrect}"`
    );
    console.log(`最終正解判定結果: "${saveAnswerCorrect}"\n ---`);
    saveAnswerCorrect = false;
  }

  // 問題正解判定
  if (allTrue) {
    isAnswerCorrect = documents.every((doc) => doc.metadata.isMatched);
  }
  return { isAnswerCorrect, userAnswerDatas };
}

/**
 * isMatched の値が変化した要素だけを抽出する関数
 * @param before
 * @param after
 * @returns
 */
export function findMatchStatusChanges(
  before: Document<HorensoMetadata>[],
  after: Document<HorensoMetadata>[]
) {
  return before.filter((beforeItem) => {
    const afterItem = after.find(
      (a) => a.metadata.parentId === beforeItem.metadata.parentId
    );
    return (
      afterItem &&
      beforeItem.metadata.isMatched !== afterItem.metadata.isMatched
    );
  });
}
