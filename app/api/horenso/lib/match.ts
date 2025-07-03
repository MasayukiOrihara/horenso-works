import { Document } from "langchain/document";

import { MatchAnswerArgs, UserAnswerEvaluation } from "@/lib/type";
import { buildSupportDocs, cachedVectorStore } from "./utils";
import {
  supportingPhrasesDeadline,
  supportingPhrasesQuality,
  supportingPhrasesSpecification,
} from "../contents/documents";
import { embeddings } from "@/lib/models";
import { cosineSimilarity } from "ai";

/** 答えを判定して正解かどうかを返す関数（openAIのembeddingsを使用） */
export async function matchAnswerOpenAi({
  userAnswer,
  documents,
  topK,

  allTrue = false,
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
      saveAnswerCorrect = true;
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
    }
    // 曖昧マッチング
    if (bestMatch.metadata.question_id === "2") {
      const parentId = bestMatch.metadata.parentId;
      const supportPhrasesMap: Record<string, string[]> = {
        "1": supportingPhrasesDeadline,
        "2": supportingPhrasesSpecification,
        "3": supportingPhrasesQuality,
      };

      const phrases = supportPhrasesMap[parentId ?? ""] ?? [];
      if (phrases.length > 0) {
        const docs = buildSupportDocs(phrases, parentId);
        const supportVectorStore = await cachedVectorStore(docs);
        const userEmbedding = await embeddings.embedQuery(userAnswer);

        // 最大スコアを取得
        const maxSimilarity =
          await supportVectorStore.similaritySearchVectorWithScore(
            userEmbedding,
            1
          );
        const topScore = maxSimilarity[0]?.[1] ?? 0;

        console.log("曖昧結果: " + topScore);
        if (topScore > 0.8) {
          documents.forEach((d) => {
            const docParentId = d.metadata.parentId ?? d.metadata.id;
            if (docParentId === parentId) {
              d.metadata.isMatched = true;
              isAnswerCorrect = true;
            }
          });
        }
      }
    }
    console.log(bestMatch);

    // 答えの結果を詰め込む
    const data: UserAnswerEvaluation = {
      question_id: bestMatch.metadata.question_id,
      userAnswer: userAnswer,
      currentAnswer: bestMatch.pageContent,
      score: score.toString(),
      isAnswerCorrect: saveAnswerCorrect,
    };
    userAnswerDatas.push(data);
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
  userAnswerData: UserAnswerEvaluation[],
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
      question_id: documents[i].metadata.question_id,
      userAnswer: userAnswer,
      currentAnswer: documents[i].pageContent,
      score: score.toString(),
      isAnswerCorrect: isAnswerCorrect,
    };
    userAnswerData.push(data);
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
