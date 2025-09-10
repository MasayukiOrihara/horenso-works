import { MatchThreshold } from "@/lib/type";

/** 基準値 */
export const BASE_MATCH_SCORE = 0.78; // 基準値
export const BASE_WORST_SCORE = 0.3;
export const WRONG_MATCH_SCORE = 0.82; // 外れ基準値
export const FUZZY_MATCH_SCORE = 0.82; // 曖昧基準値

export const DEFAULT_SCORE: MatchThreshold = {
  maxBase: BASE_MATCH_SCORE,
  minBase: BASE_WORST_SCORE,
  maxWrong: WRONG_MATCH_SCORE,
  maxFuzzy: FUZZY_MATCH_SCORE,
};
