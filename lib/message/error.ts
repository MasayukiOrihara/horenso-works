// エラーメッセージ
export const UNKNOWN_ERROR = "Unknown error occurred";
export const SESSIONID_ERROR = "sessionId is required";
export const MESSAGES_ERROR = "messages is required";
export const SUMMARY_ERROR = "メッセージを要約できませんでした。";
export const SCORE_GET_ERROR = "スコアの取得に失敗しました";
export const WRONGMATCH_ERROR = "ハズレチェック中にエラーが発生しました。: ";
export const FUZZYMATCH_ERROR = "あいまい検索中にエラーが発生しました。: ";
export const AI_EVALUATE_ERROR = "AI のよる判定結果が得られませんでした";
export const JSON_PARSE_ERROR = "JSONパース失敗";

// supabase
export const SUPABASE_KEY_ERROR = "Expected SUPABASE_SERVICE_ROLE_KEY";
export const SUPABASE_URL_ERROR = "Expected env var SUPABASE_URL";
export const SUPABASE_STORE_ERROR =
  "ストアの作成および ドキュメントの追加を失敗しました。";
export const SUPABASE_SEARCH_ERROR = "Error searching Supabase";
export const SUPABASE_NO_RESULT_ERROR =
  "No results from Supabase, fallback search";
