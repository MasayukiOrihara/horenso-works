import { Document } from "langchain/document";

import * as TYPE from "@/lib/type";
import { getMaxScoreSemanticMatch, saveSemanticScoreDB } from "../lib/semantic";
import {
  BADMATCH_ERROR,
  SCORE_GET_ERROR,
  SUPABASE_NO_RESULT_ERROR,
} from "@/lib/message/error";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { embeddings } from "@/lib/llm/models";
import { supabaseClient } from "@/lib/clients";
import { DOCUMENTS_SEARCH_QUERY } from "./similarityUserAnswerNode";
import { searchEmbeddingSupabase } from "../lib/supabase";

type BadCheckNode = {
  evaluationRecords: TYPE.Evaluation[];
  notCorrectList: TYPE.SemanticAnswerData;
};

// 定数
const BAD_MATCH_SCORE = 0.82; // 外れ基準値
const WRONGLIST_TABLE = "wronglist";
const WRONGLIST_QUERY = "search_wronglist";

/**
 * ハズレチェックを行うノード
 * @param param0
 * @returns
 */
export async function checkBadMatchNode({
  evaluationRecords,
  notCorrectList,
}: BadCheckNode) {
  const tempEvaluationRecords: TYPE.Evaluation[] = evaluationRecords;

  // 外れリストを参照する逆パターンを作成しもし一致したらこれ以降の処理を飛ばす
  try {
    await Promise.all(
      tempEvaluationRecords.map(async (record) => {
        const bestDocument = record.document as Document<TYPE.HorensoMetadata>;
        const input = record.input;

        // ベクトルストア内のドキュメントとユーザーの答えを比較
        let badScore: TYPE.FuzzyScore | null = null;
        try {
          //throw new Error("デバッグ用エラー");
          const question_id = bestDocument.metadata.question_id;

          // supabase から similarityResults を取得
          const results = await searchEmbeddingSupabase(
            WRONGLIST_TABLE,
            WRONGLIST_QUERY,
            input.embedding,
            1,
            question_id
          );

          // 変換
          const max = results[0];
          badScore = {
            id: max?.[0].metadata.id,
            score: max?.[1],
            nearAnswer: max?.[0].pageContent,
            reason: max?.[0].metadata.reason,
            correct: "unknown",
          };
        } catch (error) {
          console.error(SCORE_GET_ERROR, error);
        }

        // エラー処理
        if (!badScore) throw new Error(SCORE_GET_ERROR);
        record.badScore = badScore;
      })
    );

    // まとめてチェック
    tempEvaluationRecords.map(async (record) => {
      const badScore = record.badScore;
      if (badScore) {
        // 答えの結果が出てない
        const isAnswerUnknown = record.answerCorrect === "unknown";
        // ハズレリストの閾値以上
        const exceedsBadMatchThreshold = badScore.score > BAD_MATCH_SCORE;
        if (isAnswerUnknown && exceedsBadMatchThreshold) {
          badScore.correct = "incorrect"; // 不正解
          record.answerCorrect = badScore.correct;
        }
      }
    });
  } catch (error) {
    console.warn(BADMATCH_ERROR + error);
  }

  return { tempEvaluationRecords };
}
