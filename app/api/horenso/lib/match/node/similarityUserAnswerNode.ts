import { Document } from "langchain/document";

import { HorensoMetadata, UserAnswerEmbedding } from "@/lib/type";
import { cachedVectorStore } from "../lib/vectorStore";
import { embeddings } from "@/lib/llm/models";
import { saveEmbeddingSupabase } from "../lib/supabase";

type SimilarityNode = {
  documents: Document<HorensoMetadata>[];
  userAnswer: string;
  topK: number;
};

export const tableName = "documents";
export const queryName = "match_documents";

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
  // ベクトルストア準備と変換
  const [vectorStore, embedding] = await Promise.all([
    cachedVectorStore(documents),
    embeddings.embedQuery(userAnswer),
  ]);
  // supabase 保存
  await saveEmbeddingSupabase(documents, tableName, queryName);

  // 値の準備
  const userEmbedding: UserAnswerEmbedding = {
    userAnswer: userAnswer,
    embedding: embedding,
  };

  // ベクトルストア内のドキュメントとユーザーの答えを比較
  const similarityResults = await vectorStore.similaritySearchVectorWithScore(
    userEmbedding.embedding,
    topK
  );
  return { similarityResults, userEmbedding };
}
