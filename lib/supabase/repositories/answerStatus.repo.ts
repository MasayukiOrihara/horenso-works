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

  getBySession: (sessionId: string) =>
    dbTry(async () => {
      const { data, error } = await supabaseClient()
        .from("session_answer_status")
        .select("*")
        .eq("session_id", sessionId);
      if (error) throw new Error(error.message, { cause: error });
      return data ?? [];
    }),
};
