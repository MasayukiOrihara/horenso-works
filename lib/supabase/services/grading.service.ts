import { Result } from "@/lib/supabase/db";
import { SessionQuestionGradeRepo } from "../repositories/sessionQuestionGrade.repo";
import {
  QuestionSimilaritiesRepo,
  SimilarityRow,
} from "../repositories/questionSimilarities.repo";

// “親作成 → 子複数 upsert” を一括で（トランザクションは PostgREST だとRPC推奨）
export const GradingService = {
  upsertGradeWithSimilarities: async (
    sessionId: string,
    questionId: number,
    sims: { expectedAnswerId: string | number; similarity: number }[]
  ): Promise<Result<true>> => {
    // 1) 親
    const parent = await SessionQuestionGradeRepo.upsert(sessionId, questionId);
    if (!parent.ok) return { ok: false, error: parent.error };

    // 2) 子
    const rows: SimilarityRow[] = sims.map((s) => ({
      parent_id: sessionId,
      expected_answer_id: s.expectedAnswerId,
      similarity: s.similarity,
    }));
    const child = await QuestionSimilaritiesRepo.upsertMany(rows);
    if (!child.ok) return { ok: false, error: child.error };

    return { ok: true, value: true };
  },
};
