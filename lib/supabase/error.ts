/**
 * 共通部品：DB エラー
 */
export class DbError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: string | null,
    public hint?: string | null
  ) {
    super(message);
    this.name = "DbError";
  }
}
