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
  } catch (e: unknown) {
    // e が Error なら message は安全に取れる
    const message = e instanceof Error ? e.message : "Database error";

    // Supabase系: cause プロパティを持っていれば使う
    const cause =
      typeof e === "object" && e !== null && "cause" in e
        ? (e as { cause?: PostgrestError }).cause
        : undefined;

    const pe: PostgrestError | undefined =
      cause ?? (e as PostgrestError | undefined);

    const err = new DbError(message, pe?.code, pe?.details, pe?.hint);
    return { ok: false, error: err };
  }
}
