import { updateClueQuality } from "../lib/match/lib/entry";
import {
  insertGradeSimilaritiesSupabase,
  updateMetadataSupabase,
} from "../lib/match/lib/supabase";

import * as MSG from "@/lib/contents/horenso/template";
import { supabaseClient } from "@/lib/supabase/clients";
import * as TYPE from "@/lib/type";

type ExplainNode = {
  adjustedClue: TYPE.AdjustedClue[];
  evaluationData: TYPE.Evaluation[];
  session: TYPE.Session;
};

/**
 *
 * @param param0 回答や解説を行うノード
 * @returns
 */
export async function explainAnswerNode({
  adjustedClue,
  evaluationData,
  session,
}: ExplainNode) {
  const contexts = [];

  contexts.push("# 返答作成の手順\n\n");
  contexts.push(MSG.BULLET + MSG.SUCCESS_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.SUMMARY_REQUEST_PROMPT);

  // ここで grade を更新

  const pairs: TYPE.Similarities[] = [];
  evaluationData.map((data) => {
    const isCorrect = data.answerCorrect === "correct";
    const hasSome = pairs.some(
      (p) => p.expectedAnswerId === data.document.metadata.parentId
    );
    if (isCorrect && !hasSome) {
      const pair = {
        expectedAnswerId: data.document.metadata.parentId,
        similarity: data.documentScore.score,
      };
      pairs.push(pair);
    }
  });
  await insertGradeSimilaritiesSupabase(session.id, pairs);
  console.log(`${session.count} 回目で正解`);

  // ここで使用した前回 clue の重みを変更
  if ((adjustedClue ?? []).length != 0) {
    // 正解だったため過去回答の有用性を上げる
    const updateAdjustedClue: TYPE.AdjustedClue[] = updateClueQuality(
      adjustedClue,
      0.1
    );
    // DB 更新
    for (const adjusted of updateAdjustedClue) {
      await updateMetadataSupabase(adjusted.id, "quality", adjusted.quality);
    }
  }

  return { contexts };
}
