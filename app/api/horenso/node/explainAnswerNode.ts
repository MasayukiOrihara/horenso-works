import { updateClueQuality } from "../lib/match/lib/entry";

import * as MSG from "@/lib/contents/horenso/template";
import { METADATA_QUALITY_KEY } from "@/lib/contents/match";
import { MetadataRepo } from "@/lib/supabase/repositories/metadata.repo";
import * as TYPE from "@/lib/type";

type ExplainNode = {
  adjustedClue: TYPE.AdjustedClue[];
};

/**
 *
 * @param param0 回答や解説を行うノード
 * @returns
 */
export async function explainAnswerNode({ adjustedClue }: ExplainNode) {
  const contexts = [];

  contexts.push("# 返答作成の手順\n\n");
  contexts.push(MSG.BULLET + MSG.SUCCESS_MESSAGE_PROMPT);
  contexts.push(MSG.BULLET + MSG.SUMMARY_REQUEST_PROMPT);

  /** ここで使用した前回 clue の重みを変更 */
  if ((adjustedClue ?? []).length != 0) {
    // 正解だったため過去回答の有用性を上げる
    const updateAdjustedClue: TYPE.AdjustedClue[] = updateClueQuality(
      adjustedClue,
      0.1
    );
    // DB 更新
    for (const adjusted of updateAdjustedClue) {
      const r = await MetadataRepo.updateByMetaId(
        adjusted.id,
        METADATA_QUALITY_KEY,
        adjusted.quality
      );
      if (!r.ok) {
        // エラー時: 更新失敗でも止めない
        console.warn("quality の更新失敗しました: " + r.error);
      }
    }
  }

  return { contexts };
}
