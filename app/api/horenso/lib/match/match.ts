import { Document } from "langchain/document";

import { MatchAnswerArgs, UserAnswerEvaluation } from "@/lib/type";
import * as SEM from "./semantic";
import { cachedVectorStore } from "./vectorStore";

/** 答えを判定して正解かどうかを返す関数（openAIのembeddingsを使用） */
export async function matchAnswerOpenAi({
  userAnswer,
  documents,
  topK,
  allTrue = false,
  semanticList,
  semanticPath,
}: MatchAnswerArgs) {
  let isAnswerCorrect = false;
  let saveAnswerCorrect = false;
  const userAnswerDatas: UserAnswerEvaluation[] = [];

  // ベクトルストア準備
  const vectorStore = await cachedVectorStore(documents);
  // ベクトルストア内のドキュメントとユーザーの答えを比較
  const similarityResults = await vectorStore.similaritySearchWithScore(
    userAnswer,
    topK
  );
  for (const [bestMatch, score] of similarityResults) {
    console.log("score: " + score + ", match: " + bestMatch.pageContent);

    // スコアが閾値以上の場合3つのそれぞれのフラグを上げる(閾値スコアは固定で良い気がする)
    if (score >= 0.78) {
      for (const doc of documents) {
        if (bestMatch.pageContent === doc.pageContent) {
          // 同じparentIdのフラグ上げる
          const bestParentId =
            bestMatch.metadata.parentId ?? bestMatch.metadata.id;
          documents.map((d) => {
            const parentId = d.metadata.parentId ?? d.metadata.id;
            if (bestParentId === parentId) d.metadata.isMatched = true;
          });
          isAnswerCorrect = true;

          console.log(bestMatch.pageContent + " : " + doc.metadata.isMatched);
        }
      }
      saveAnswerCorrect = true;
    } else {
      // 曖昧マッチングを行う
      const parentId = bestMatch.metadata.parentId;
      // ※※ この辺で外れリストを参照する逆パターンを作成しもし一致したらこれ以降の処理を飛ばす

      const topScore = await SEM.getMaxScoreSemanticMatch(
        bestMatch,
        semanticList,
        userAnswer
      );
      console.log("曖昧結果: " + topScore);
      if (topScore > 0.8) {
        documents.forEach((d) => {
          const docParentId = d.metadata.parentId ?? d.metadata.id;
          if (docParentId === parentId) {
            d.metadata.isMatched = true;
            isAnswerCorrect = true;
            saveAnswerCorrect = true;
          }
        });
      } else {
        // スコアが下回った場合、調べる
        console.log("解答適正チェック");
        const semanticJudge = await SEM.judgeSemanticMatch(
          userAnswer,
          documents
        );
        console.log(semanticJudge);
        console.log(bestMatch);

        // 比較対象回答と一致しているかの確認
        const checkIdMatch =
          String(semanticJudge.metadata.parentId) ===
          bestMatch.metadata.parentId;
        if (semanticJudge && checkIdMatch) {
          console.log("適正あり");
          // jsonの更新
          const updated = SEM.updateSemanticMatch(
            semanticJudge,
            semanticList,
            semanticPath,
            bestMatch.metadata.question_id
          );
          // 更新された場合正解とする
          if (updated) {
            documents.forEach((d) => {
              const docParentId = d.metadata.parentId ?? d.metadata.id;
              if (docParentId === parentId) {
                d.metadata.isMatched = true;
                isAnswerCorrect = true;
                saveAnswerCorrect = true;
              }
            });
          }
        }
      }
    }
    // 答えの結果をユーザー回答データとして詰め込む
    const data: UserAnswerEvaluation = {
      parentId: bestMatch.metadata.parentId,
      question_id: bestMatch.metadata.question_id,
      userAnswer: userAnswer,
      currentAnswer: bestMatch.pageContent,
      score: score.toString(),
      isAnswerCorrect: saveAnswerCorrect,
    };
    userAnswerDatas.push(data);

    // 結果をログへ
    console.log(
      `対象回答: "${bestMatch.pageContent}" 対象回答は正解済みか: "${bestMatch.metadata.isMatched}"`
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

/** HuggingFaceのAPIを使用して類似度を計算する関数（※※※未調整） */
export async function matchAnswerHuggingFaceAPI(
  userAnswer: string,
  documents: Document[],
  threshold: number,
  userAnswerDatas: UserAnswerEvaluation[],
  allTrue = false
) {
  let isAnswerCorrect = false;

  console.log(" ---\n HuggingFace APIでの回答チェック");
  const getScore = await fetch(
    "https://api-inference.huggingface.co/models/sentence-transformers/all-mpnet-base-v2",
    {
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: {
          source_sentence: userAnswer,
          sentences: documents.map((doc) => doc.pageContent),
        },
      }),
    }
  );
  const response = await getScore.json();

  // スコアが閾値以上のドキュメントをマッチさせる
  response.forEach((score: number, i: number) => {
    console.log(`${documents[i].pageContent} : ${score}`);
    if (score >= threshold) {
      documents[i].metadata.isMatched = true;
      isAnswerCorrect = true;
    }
    // 答えの結果を詰め込む
    const data: UserAnswerEvaluation = {
      parentId: documents[i].metadata.parentId,
      question_id: documents[i].metadata.question_id,
      userAnswer: userAnswer,
      currentAnswer: documents[i].pageContent,
      score: score.toString(),
      isAnswerCorrect: isAnswerCorrect,
    };
    userAnswerDatas.push(data);
  });

  // 問題正解判定
  if (allTrue) {
    isAnswerCorrect = documents.every((doc) => doc.metadata.isMatched);
  }
  return isAnswerCorrect;
}

/**
 * isMatched の値が変化した要素だけを抽出する関数
 * @param before
 * @param after
 * @returns
 */
export function findMatchStatusChanges(before: Document[], after: Document[]) {
  return after.filter((afterItem) => {
    const beforeItem = before.find(
      (b) => b.metadata.id === afterItem.metadata.id
    );
    return (
      beforeItem &&
      beforeItem.metadata.isMatched !== afterItem.metadata.isMatched
    );
  });
}
