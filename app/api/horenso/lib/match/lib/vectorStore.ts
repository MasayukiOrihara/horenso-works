import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
import { embeddings } from "@/lib/llm/embedding";

/** vector store が既にあるかのチェック */
let cachedStore: MemoryVectorStore | null = null;
let cachedDocHash = "";
export async function cachedVectorStore(documents: Document[]) {
  // contentだけを使ってハッシュ化
  function hashDocuments(docs: Document[]): string {
    const contentOnly = docs
      .map((doc) => doc.pageContent)
      .filter((text) => typeof text === "string" && text.trim() !== "");
    return JSON.stringify(contentOnly);
  }

  // 文書の事前バリデーション（無効なものを除去）
  const validDocuments = documents.filter((doc, index) => {
    const isValid =
      typeof doc.pageContent === "string" && doc.pageContent.trim() !== "";
    if (!isValid) {
      console.warn(
        `⚠️ 無効なドキュメント（index: ${index}）を除外しました`,
        doc
      );
    }
    return isValid;
  });

  const currentDocHash = hashDocuments(validDocuments);

  // キャッシュがなければ新しく作成（同じ文書なら再利用）
  if (!cachedStore || cachedDocHash !== currentDocHash) {
    cachedStore = await MemoryVectorStore.fromDocuments(
      validDocuments,
      embeddings
    );
    cachedDocHash = currentDocHash;
  }

  return cachedStore;
}
