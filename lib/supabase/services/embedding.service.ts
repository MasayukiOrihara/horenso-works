import type { Document } from "@langchain/core/documents";
import type { Embeddings } from "@langchain/core/embeddings";
import { Result } from "@/lib/supabase/db";
import { getVectorStore } from "../vector/store";
import { DbError } from "../error";

export const EmbeddingService = {
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

  searchByVector: async (
    embeddings: Embeddings,
    tableName: string,
    queryName: string,
    vectorData: number[],
    k: number,
    filter: Record<string, any>
  ): Promise<Result<Array<[any, number]>>> => {
    try {
      const store = getVectorStore(embeddings, tableName, queryName);
      const res = await store.similaritySearchVectorWithScore(
        vectorData,
        k,
        filter
      );
      if (!res?.length) {
        return { ok: false, error: new DbError("No result") };
      }
      return { ok: true, value: res };
    } catch (e: any) {
      return { ok: false, error: new DbError(e?.message ?? "search error") };
    }
  },
};
