import { AdjustedClue } from "@/lib/type";
import { updateClueQuality } from "../lib/match/lib/entry";
import { updateMetadataSupabase } from "../lib/match/lib/supabase";

import * as MSG from "@/lib/contents/horenso/template";

/**
 *
 * @param param0 回答や解説を行うノード
 * @returns
 */
export async function explainAnswerNode(adjustedClue: AdjustedClue[]) {
  const contexts = [];

  contexts.push("# 返答作成の手順\n\n");
  contexts.push(MSG.BULLET + MSG.SUCCESS_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.SUMMARY_REQUEST_PROMPT);

  // ここで使用した前回 clue の重みを変更
  if ((adjustedClue ?? []).length != 0) {
    // 正解だったため過去回答の有用性を上げる
    const updateAdjustedClue: AdjustedClue[] = updateClueQuality(
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
