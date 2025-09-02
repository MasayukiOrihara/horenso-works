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

/**
 * ユーザープロファイルを管理するスキーマ
 */
export const userprofileSchema = z.object({
  name: z.string().trim().max(50),
  gender: z.enum(["male", "female", "none"]),
  country: z.enum(["japan", "usa", "other"]),
  company: z.string().trim().max(50),
  organization: z.enum(["dev", "sales", "hr", "other"]),
});
export type userprofileFormValues = z.infer<typeof userprofileSchema>;
