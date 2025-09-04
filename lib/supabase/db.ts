import { PostgrestError } from "@supabase/supabase-js";
import { DbError } from "./error";

export type Result<T> = { ok: true; value: T } | { ok: false; error: DbError };

/**
 * Result 型のラッパ
 * @param fn
 * @returns
 */
export async function dbTry<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (e: any) {
    // Supabase系 or それ以外でも DbError に正規化
    const pe: PostgrestError | undefined = e?.cause ?? e;
    const err = new DbError(
      e?.message ?? "Database error",
      pe?.code,
      pe?.details,
      pe?.hint
    );
    return { ok: false, error: err };
  }
}
