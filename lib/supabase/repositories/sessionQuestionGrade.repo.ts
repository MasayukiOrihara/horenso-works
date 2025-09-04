import { dbTry } from "@/lib/supabase/db";
import { supabaseClient } from "../clients";

export const SessionQuestionGradeRepo = {
  upsert: async (sessionId: string, questionId: number, difficulty = 1.2) =>
    dbTry(async () => {
      const { data, error } = await supabaseClient()
        .from("session_question_grade")
        .upsert(
          {
            session_id: sessionId,
            question_id: questionId,
            difficulty_coeff: difficulty,
          },
          { onConflict: "session_id", ignoreDuplicates: true }
        )
        .select()
        .maybeSingle();

      if (error) throw new Error(error.message, { cause: error });
      return data;
    }),
};
