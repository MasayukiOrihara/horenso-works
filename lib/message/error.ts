// エラーメッセージ
export const UNKNOWN_ERROR = "Unknown error occurred";
export const SESSIONID_ERROR = "sessionId is required";
export const MESSAGES_ERROR = "messages is required";
export const RECUESTBODY_ERROR = "request body is required";
export const LISTNAME_ERROR = "listname is required.";
export const SUMMARY_ERROR = "メッセージを要約できませんでした。";
export const SCORE_GET_ERROR = "スコアの取得に失敗しました";
export const WRONGMATCH_ERROR = "ハズレチェック中にエラーが発生しました。: ";
export const FUZZYMATCH_ERROR = "あいまい検索中にエラーが発生しました。: ";
export const AI_EVALUATE_ERROR = "AI のよる判定結果が得られませんでした";
export const JSON_PARSE_ERROR = "JSONパース失敗";
export const RECUEST_ERROR = "✖ APIリクエストエラー: ";
export const RETRY_ERROR = "最大リトライ回数を超えました";
export const DATA_SAVE_ERROR = "✖ データ保存に失敗しました";
export const DATA_LOAD_ERROR = "✖ データ取得に失敗しました";
export const ADD_RESPONSE_ERROR = "返答例の取得に失敗しました";
export const LIST_UPDATE_ERROR = "リストの更新に失敗しました";
export const INPUT_ANALYZE_ERROR = "✖ 入力分析に失敗しました";

// preprocess ai node
export const PREPROCESS_AI_HINT_ERROR =
  "match preproceeAI Error: hint or analyze";
export const PREPROCESS_AI_CHECKANSWER_ERROR =
  "match preproceeAI Error: checkAnswer";
export const PREPROCESS_AI_USERANSWER_ERROR =
  "match preproceeAI Error: userAnswer or userVector";

// supabase
export const SUPABASE_KEY_ERROR = "Expected SUPABASE_SERVICE_ROLE_KEY";
export const SUPABASE_URL_ERROR = "Expected env var SUPABASE_URL";
export const SUPABASE_STORE_ERROR =
  "ストアの作成および ドキュメントの追加を失敗しました。";
export const SUPABASE_SEARCH_ERROR = "Error searching Supabase";
export const SUPABASE_NO_RESULT_ERROR =
  "No results from Supabase, fallback search";
export const SUPABASE_UPSERT_ERROR = "Supabase upsert error: ";

// ユーザーへ表示
// エラー
export const FATAL_ERROR = "致命的なエラーが発生しました";
export const USERPROFILE_SEND_ERROR =
  "ユーザープロファイルの送信に失敗しました";
export const RELOAD_BROWSER = "ブラウザを再読み込みしてください";
