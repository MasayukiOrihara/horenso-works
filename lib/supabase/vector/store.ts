import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import type { Embeddings } from "@langchain/core/embeddings";
import { supabaseClient } from "../clients";

const storeCache = new Map<string, SupabaseVectorStore>();

/**
 * VectorStoreの生成を一本化・キャッシュ
 * @param embeddings
 * @param tableName
 * @param queryName
 * @returns
 */
export function getVectorStore(
  embeddings: Embeddings,
  tableName: string,
  queryName: string
) {
  const key = `${tableName}::${queryName}`;
  if (storeCache.has(key)) return storeCache.get(key)!;

  const store = new SupabaseVectorStore(embeddings, {
    client: supabaseClient(),
    tableName,
    queryName,
  });
  storeCache.set(key, store);
  return store;
}
