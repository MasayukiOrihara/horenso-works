import { dbTry } from "@/lib/supabase/db";
import { supabaseClient } from "../clients";

export type SessionQuestionStatsRow = {
  session_id: string;
  question_id: string;
  retry_count: number;
  hint_count: number;
  updated_at: string;
};

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

  /** セッション×設問のカウンタ（無ければ 0 を返す） */
  getBySessionQuestion: (sessionId: string, questionId: string) =>
    dbTry<{ retry_count: number; hint_count: number }>(async () => {
      const { data, error } = await supabaseClient()
        .from("session_question_stats")
        .select("retry_count, hint_count")
        .eq("session_id", sessionId)
        .eq("question_id", questionId)
        .maybeSingle();

      if (error) throw new Error(error.message, { cause: error });
      return data ?? { retry_count: 0, hint_count: 0 };
    }),

  /** セッション内の全設問分を取得（一覧） */
  listBySession: (sessionId: string) =>
    dbTry<SessionQuestionStatsRow[]>(async () => {
      const { data, error } = await supabaseClient()
        .from("session_question_stats")
        .select("session_id, question_id, retry_count, hint_count, updated_at")
        .eq("session_id", sessionId)
        .order("updated_at", { ascending: false });

      if (error) throw new Error(error.message, { cause: error });
      return (data ?? []) as SessionQuestionStatsRow[];
    }),
};
