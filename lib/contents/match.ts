/** DB テーブル名とクエリ */
export const WRONGLIST_TABLE = "wronglist";
export const WRONGLIST_QUERY = "search_wronglist";

export const FUZZYLIST_TABLE = "fuzzylist";
export const FUZZYLIST_QUERY = "search_fuzzylist";

export const DOCUMENT_TABLE = "documents";
export const DOCUMENTS_SEARCH_QUERY = "search_similar_documents";

export const CLUE_TABLE = "cluelist";
export const CLUE_QUERY = "search_cluelist";

export const MEMORY_TABLE = "memory_text_data";

/** 基準値 */
export const BASE_MATCH_SCORE = 0.78; // 基準値
export const BASE_WORST_SCORE = 0.3;
export const WRONG_MATCH_SCORE = 0.82; // 外れ基準値
export const FUZZY_MATCH_SCORE = 0.82; // 曖昧基準値

export type MatchThreshold = {
  maxBaseThreshold: number;
  minBaseThreshold: number;
  maxWrongThreshold: number;
  maxFuzzyThreshold: number;
};
