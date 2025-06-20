import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";

import { MatchAnswerArgs, UserAnswerEvaluation } from "@/lib/type";

import { cachedVectorStore } from "./utils";

/** 答えを判定して正解かどうかを返す関数（openAIのembeddingsを使用） */
export async function matchAnswerOpenAi({
  userAnswer,
  documents,
  topK,
  threshold,
  userAnswerData,
  allTrue = false,
}: MatchAnswerArgs) {
  let isAnswerCorrect = false;

  // ベクトルストア準備
  const vectorStore = await cachedVectorStore(documents);
  // ベクトルストア内のドキュメントとユーザーの答えを比較
  const similarityResults = await vectorStore.similaritySearchWithScore(
    userAnswer,
    topK
  );
  for (const [bestMatch, score] of similarityResults) {
    console.log("score: " + score + ", match: " + bestMatch.pageContent);

    // スコアが閾値以上の場合3つのそれぞれのフラグを上げる
    if (score >= threshold) {
      for (const doc of documents) {
        if (bestMatch.pageContent === doc.pageContent) {
          doc.metadata.isMatched = true;
          isAnswerCorrect = true;

          console.log(bestMatch.pageContent + " : " + doc.metadata.isMatched);
        }
      }
    }
    // 答えの結果を詰め込む
    const data: UserAnswerEvaluation = {
      question_id: bestMatch.metadata.question_id,
      userAnswer: userAnswer,
      currentAnswer: bestMatch.pageContent,
      score: score.toString(),
      isAnswerCorrect: isAnswerCorrect,
    };
    userAnswerData.push(data);
  }

  // 問題正解判定
  if (allTrue) {
    isAnswerCorrect = documents.every((doc) => doc.metadata.isMatched);
  }
  return isAnswerCorrect;
}

/** HuggingFaceのAPIを使用して類似度を計算する関数 */
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
