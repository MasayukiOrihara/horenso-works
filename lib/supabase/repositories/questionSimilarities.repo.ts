import { dbTry } from "@/lib/supabase/db";
import { supabaseClient } from "../clients";

export type SimilarityRow = {
  parent_id: string;
  expected_answer_id: string | number;
  similarity: number;
};

export const QuestionSimilaritiesRepo = {
  upsertMany: async (rows: SimilarityRow[]) =>
    dbTry(async () => {
      const { error } = await supabaseClient()
        .from("question_similarities")
        .upsert(rows, {
          onConflict: "parent_id,expected_answer_id",
          ignoreDuplicates: true,
        });

      if (error) throw new Error(error.message, { cause: error });
      return true;
    }),
};
