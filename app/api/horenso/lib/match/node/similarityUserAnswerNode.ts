import { Document } from "langchain/document";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

import { HorensoMetadata, UserAnswerEmbedding } from "@/lib/type";
import { cachedVectorStore } from "../lib/vectorStore";
import { embeddings } from "@/lib/llm/models";
import { supabaseClient } from "@/lib/clients";
import {
  SUPABASE_NO_RESULT_ERROR,
  SUPABASE_SEARCH_ERROR,
} from "@/lib/message/error";
import { searchEmbeddingSupabase } from "../lib/supabase";

type SimilarityNode = {
  documents: Document<HorensoMetadata>[];
  userAnswer: string;
  topK: number;
};

// 定数
const DOCUMENT_TABLE = "documents";
export const DOCUMENTS_SEARCH_QUERY = "search_similar_documents";

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
  const embedding = await embeddings.embedQuery(userAnswer);
  const question_id = documents[0].metadata.question_id;
  const userEmbedding: UserAnswerEmbedding = {
    userAnswer: userAnswer,
    embedding: embedding,
  };

  // ベクトルストア内のドキュメントとユーザーの答えを比較
  let similarityResults;
  try {
    //throw new Error("デバッグ用エラー");

    // supabase から similarityResults を取得
    similarityResults = await searchEmbeddingSupabase(
      DOCUMENT_TABLE,
      DOCUMENTS_SEARCH_QUERY,
      embedding,
      topK,
      question_id
    );
  } catch (error) {
    console.error(SUPABASE_SEARCH_ERROR, error);
    // エラー時のフォールバック
    similarityResults = await doFallbackSearch(documents, embedding, topK);
  }

  return { similarityResults, userEmbedding };
}

// ベクトルストアを作り document を変換して検索
async function doFallbackSearch(
  documents: Document<HorensoMetadata>[],
  embedding: number[],
  topK: number
) {
  // ベクトルストア準備
  const vectorStore = await cachedVectorStore(documents);
  // ベクトルストア内のドキュメントとユーザーの答えを比較
  const similarityResults = await vectorStore.similaritySearchVectorWithScore(
    embedding,
    topK
  );
  return similarityResults;
}
