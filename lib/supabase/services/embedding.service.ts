import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import { Result } from "@/lib/supabase/db";
import { getVectorStore } from "../vector/store";
import { DbError } from "../error";

export const EmbeddingService = {
  /** document データをストアに入れて DB に保存する処理 */
  save: async (
    embeddings: Embeddings,
    docs: Document[],
    tableName: string
  ): Promise<Result<true>> => {
    try {
      const store = getVectorStore(embeddings, tableName, "");
      await store.addDocuments(docs);
      return { ok: true, value: true };
    } catch (e: any) {
      return { ok: false, error: new DbError(e?.message ?? "store error") };
    }
  },

  /** ベクターから検索する処理（0件は例外扱いにする）*/
  searchByVector: async (
    embeddings: Embeddings,
    tableName: string,
    queryName: string,
    vectorData: number[],
    k: number,
    filter: Record<string, any>
  ) => {
    try {
      const store = getVectorStore(embeddings, tableName, queryName);
      const res = await store.similaritySearchVectorWithScore(
        vectorData,
        k,
        filter
      );
      if (!res?.length) throw new DbError("No result");
      return res;
    } catch (e: any) {
      throw new DbError(e?.message ?? "search error");
    }
  },
};
