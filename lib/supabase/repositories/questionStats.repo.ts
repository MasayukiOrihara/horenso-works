import { dbTry } from "@/lib/supabase/db";
import { supabaseClient } from "../clients";

export const QuestionStatsRepo = {
  incRetry: (sessionId: string, questionId: string) =>
    dbTry(async () => {
      const { data, error } = await supabaseClient().rpc("inc_retry_count", {
        p_session_id: sessionId,
        p_question_id: questionId,
      });
      if (error) throw new Error(error.message, { cause: error });
      return data; // 更新後の行
    }),

  incHint: (sessionId: string, questionId: string) =>
    dbTry(async () => {
      const { data, error } = await supabaseClient().rpc("inc_hint_count", {
        p_session_id: sessionId,
        p_question_id: questionId,
      });
      if (error) throw new Error(error.message, { cause: error });
      return data;
    }),
};
