import { z } from "zod";

export const ChatRequestOptionsSchema = z.object({
  memoryOn: z.boolean(),
  learnOn: z.boolean(),
  addPromptOn: z.boolean(),
  debug: z.boolean(),
  step: z.number(),
});

/**
 * LLM からオブジェクトを取得するときのスキーマ
 */
const phrasesMetadataScheme = z.object({
  id: z.string(),
  question_id: z.string(),
  parentId: z.string().nullable(),
  rationale: z.string().optional(),
  source: z.enum(["user", "bot", "admin"]),
});
const documentSchema = z.object({
  pageContent: z.string(),
  metadata: phrasesMetadataScheme,
});
// 複数 Document に対応するスキーマ
export const documentsSchema = z.array(documentSchema);
