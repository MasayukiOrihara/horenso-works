import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import { Document } from "langchain/document";

import { embeddings } from "@/lib/models";
import { HorensoStates, MatchAnswerArgs } from "@/lib/type";

/** 答えを判定して正解かどうかを返す関数（openAIのembeddingsを使用） */
export async function matchAnswerOpenAi({
  userAnswer,
  documents,
  topK,
  threshold,
  allTrue = false,
}: MatchAnswerArgs) {
  let isAnswerCorrect = false;

  console.log("---\n OpenAI Embeddingsでの回答チェック");

  // ベクトルストア準備
  const vectorStore = await MemoryVectorStore.fromDocuments(
    documents,
    embeddings
  );
  console.log("ベクトルストアの準備が完了しました。");

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
  }
  console.log("---");

  // 問題正解判定
  if (allTrue) {
    isAnswerCorrect = documents.every((doc) => doc.metadata.isMatched);
  }
  return isAnswerCorrect;
}

// HuggingFaceのAPIを使用して類似度を計算する関数
export async function matchAnswerHuggingFaceAPI(
  userAnswer: string,
  documents: Document[],
  threshold: number,
  allTrue = false
) {
  let isAnswerCorrect = false;

  console.log("---\n HuggingFace APIでの回答チェック");
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
  });

  console.log("---");

  // 問題正解判定
  if (allTrue) {
    isAnswerCorrect = documents.every((doc) => doc.metadata.isMatched);
  }
  return isAnswerCorrect;
}

/** メッセージ形式をStringに変換する関数 */
export function messageToText(message: BaseMessage[], index: number) {
  const result =
    typeof message[index].content === "string"
      ? message[index].content
      : message[index].content
          .map((c: { type?: string; text?: string }) => c.text ?? "")
          .join("");

  return result;
}

/** グラフ内の状態を司るアノテーション */
export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  contexts: Annotation<string>({
    value: (state: string = "", action: string) => state + action,
    default: () => "",
  }),
  transition: Annotation<HorensoStates>({
    value: (
      state: HorensoStates = {
        isAnswerCorrect: false,
        hasQuestion: true,
        step: 0,
      },
      action: Partial<HorensoStates>
    ) => ({
      ...state,
      ...action,
    }),
  }),
});

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
