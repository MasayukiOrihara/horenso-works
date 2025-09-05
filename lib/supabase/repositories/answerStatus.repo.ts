import { dbTry } from "@/lib/supabase/db";
import { supabaseClient } from "../clients";

export const AnswerStatusRepo = {
  upsert: (
    sessionId: string,
    questionId: string,
    expectedAnswerId: string,
    isMatched: boolean,
    score: number
  ) =>
    dbTry(async () => {
      const { data, error } = await supabaseClient().rpc(
        "upsert_answer_status",
        {
          p_session_id: sessionId,
          p_question_id: questionId,
          p_expected_answer_id: expectedAnswerId,
          p_is_matched: isMatched,
          p_score: score,
        }
      );
      if (error) throw new Error(error.message, { cause: error });
      return data; // 更新後の行
    }),

  listBySession: (sessionId: string) =>
    dbTry(async () => {
      const { data, error } = await supabaseClient()
        .from("session_answer_status")
        .select(
          "question_id, expected_answer_id, is_matched, max_vector, updated_at"
        )
        .eq("session_id", sessionId)
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message, { cause: error });
      return data ?? [];
    }),
};
