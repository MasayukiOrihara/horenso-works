import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

import { embeddings } from "@/lib/models";
import { HorensoStates, MatchAnswerArgs } from "@/lib/type";

/** 答えを判定して正解かどうかを返す関数 */
export async function matchAnswer({
  userAnswer,
  documents,
  topK,
  threshold,
  allTrue = false,
}: MatchAnswerArgs) {
  let isAnswerCorrect = false;

  // ベクトルストア準備
  const vectorStore = await MemoryVectorStore.fromDocuments(
    documents,
    embeddings
  );
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
