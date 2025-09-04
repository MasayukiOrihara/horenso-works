import { Document } from "langchain/document";

import { HorensoMetadata, UserAnswerEmbedding } from "@/lib/type";
import { cachedVectorStore } from "../lib/vectorStore";

import { SUPABASE_SEARCH_ERROR } from "@/lib/message/error";

import * as CON from "@/lib/contents/match";
import { embeddings } from "@/lib/llm/embedding";
import { EmbeddingService } from "@/lib/supabase/services/embedding.service";
import { DbError } from "@/lib/supabase/error";

type SimilarityNode = {
  documents: Document<HorensoMetadata>[];
  userAnswer: string;
  topK: number;
};

/**
 * 正誤判定の初期化を行うノード
 * @param param0
 * @returns
 */
export async function similarityUserAnswerNode({
  documents,
  userAnswer,
  topK,
}: SimilarityNode) {
  // ユーザーの回答設定
  const userVector = await embeddings.embedQuery(userAnswer);
  const question_id = documents[0].metadata.question_id;
  const userEmbedding: UserAnswerEmbedding = {
    userAnswer: userAnswer,
    vector: userVector,
  };

  // ベクトルストア内のドキュメントとユーザーの答えを比較
  let similarityResults;
  try {
    // ベクタ検索（Service 側で throw 済み前提）
    const similarityResults = await EmbeddingService.searchByVector(
      embeddings,
      CON.DOCUMENT_TABLE,
      CON.DOCUMENTS_SEARCH_QUERY,
      userVector,
      topK,
      { question_id }
    );

    return { similarityResults, userEmbedding };
  } catch (error) {
    const err = error as DbError;
    console.warn(SUPABASE_SEARCH_ERROR, err);

    // エラー時のフォールバック
    similarityResults = await doFallbackSearch(documents, userVector, topK);
  }
}

// ベクトルストアを作り document を変換して検索
async function doFallbackSearch(
  documents: Document<HorensoMetadata>[],
  vector: number[],
  topK: number
) {
  try {
    // ベクトルストア準備
    const vectorStore = await cachedVectorStore(documents);
    // ベクトルストア内のドキュメントとユーザーの答えを比較
    const similarityResults = await vectorStore.similaritySearchVectorWithScore(
      vector,
      topK
    );
    return similarityResults;
  } catch (error) {
    console.error(SUPABASE_SEARCH_ERROR, error);
    throw error; // 上に投げる
  }
}
