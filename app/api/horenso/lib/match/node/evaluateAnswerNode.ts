import { Document } from "langchain/document";
import { v4 as uuidv4 } from "uuid";

import * as TYPE from "@/lib/type";
import { AI_EVALUATE_ERROR } from "@/lib/message/error";
import { evaluateUserAnswer } from "../../llm/evaluateUserAnswer";
import { FUZZYLIST_TABLE } from "@/lib/contents/match";
import { EmbeddingService } from "@/lib/supabase/services/embedding.service";
import { embeddings } from "@/lib/llm/embedding";

type EvaluateNode = {
  evaluationRecords: TYPE.Evaluation[];
  documents: Document<TYPE.HorensoMetadata>[];
};

/**
 * AI による回答評価
 * @param param0
 * @returns
 */
export async function evaluateAnswerNode({
  evaluationRecords,
  documents,
}: EvaluateNode) {
  // AI による判定
  let evaluate: Document<TYPE.PhrasesMetadata>[] | null = null;
  try {
    const userAnswer = evaluationRecords[0].input.userAnswer;
    // LLM 応答
    evaluate = await evaluateUserAnswer(userAnswer, documents);
  } catch (error) {
    // エラー時: 取得できなかった場合でも内部でのログのみ
    console.warn(AI_EVALUATE_ERROR + error);
    return { tempEvaluationRecords: evaluationRecords };
  }

  // 判定結果を取得
  const goodEvaluations: Document<TYPE.PhrasesMetadata>[] = [];
  if (evaluate) {
    evaluationRecords.map(async (record) => {
      const bestDocument = record.document as Document<TYPE.HorensoMetadata>;
      const beaId = bestDocument.metadata.expectedAnswerId;

      // 比較対象回答と一致しているかの確認
      for (const data of evaluate) {
        const deaId = data.metadata.expectedAnswerId;
        if (!deaId) continue;

        const checkIdMatch = deaId === beaId;
        if (!checkIdMatch) continue;

        // 合格判定
        goodEvaluations.push(data);

        // オブジェクトの更新
        const fuzzyScore: TYPE.FuzzyScore = {
          id: data.metadata.id ?? uuidv4(),
          expectedAnswerId: deaId,
          score: 1,
          reason: data.metadata.rationale,
          correct: "correct",
        };
        record.fuzzyScore = fuzzyScore;
        record.answerCorrect = "correct";
      }
    });
  }

  // DB の更新
  if (goodEvaluations && goodEvaluations.length) {
    const r = await EmbeddingService.save(
      embeddings,
      goodEvaluations,
      FUZZYLIST_TABLE
    );
    if (!r.ok) {
      // エラー時: 保存失敗しても内部ログのみ
      console.error(
        "保存に失敗:",
        r.error.message,
        r.error.code,
        r.error.details
      );
    }
    console.log("✅ 正解と判定した回答を データベース に保存しました。");
  }

  return { tempEvaluationRecords: evaluationRecords };
}
