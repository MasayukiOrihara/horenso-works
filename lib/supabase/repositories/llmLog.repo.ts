import { dbTry } from "@/lib/supabase/db";
import { supabaseClient } from "@/lib/supabase/clients";

export type LlmLogInsert = {
  session_id: string; // uuid文字列想定
  label: string;
  llm_name: string;
  prompt: string; // プロンプト全文
  output: string; // 出力全文
  tokens_prompt?: number | null;
  tokens_output?: number | null;
  latency_ms?: number | null;
  extra?: Record<string, unknown>; // 可変メタ
};

export type LlmLogRow = LlmLogInsert & {
  id: string;
  created_at: string; // ISO
  extra: Record<string, unknown>;
};

export const LlmLogRepo = {
  insert: async (row: LlmLogInsert) =>
    dbTry<LlmLogRow>(async () => {
      const { data, error } = await supabaseClient()
        .from("llm_logs")
        .insert({
          ...row,
          tokens_prompt: row.tokens_prompt ?? null,
          tokens_output: row.tokens_output ?? null,
          latency_ms: row.latency_ms ?? null,
          extra: row.extra ?? {},
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message, { cause: error });
      return data!;
    }),
};
