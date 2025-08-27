import { Document } from "langchain/document";

import { HorensoMetadata, UserAnswerEmbedding } from "@/lib/type";
import { cachedVectorStore } from "../lib/vectorStore";
import { embeddings } from "@/lib/llm/models";
import { saveEmbeddingSupabase } from "../lib/supabase";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { supabaseClient } from "@/lib/clients";

type SimilarityNode = {
  documents: Document<HorensoMetadata>[];
  userAnswer: string;
  topK: number;
};

// 定数
const DOCUMENT_TABLE = "documents";
const DOCUMENTS_SEARCH_QUERY = "search_similar_documents";

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
  // VectorStoreをSupabaseから設定
  const vectorStore = new SupabaseVectorStore(embeddings, {
    client: supabaseClient(),
    tableName: DOCUMENT_TABLE,
    queryName: DOCUMENTS_SEARCH_QUERY,
  });

  // ユーザーの回答設定
  const userEmbedding: UserAnswerEmbedding = {
    userAnswer: userAnswer,
    embedding: await embeddings.embedQuery(userAnswer),
  };

  // ベクトルストア内のドキュメントとユーザーの答えを比較
  const question_id = documents[0].metadata.question_id;
  const similarityResults = await vectorStore.similaritySearchVectorWithScore(
    userEmbedding.embedding,
    topK,
    { question_id: question_id } // RPC に渡る
  );

  console.log(similarityResults);
  return { similarityResults, userEmbedding };
}
