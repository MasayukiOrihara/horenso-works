import { whoDocuments } from "@/lib/contents/horenso/documents";
import { updateClueQuality } from "../lib/match/lib/entry";

import * as MSG from "@/lib/contents/horenso/template";
import { METADATA_QUALITY_KEY } from "@/lib/contents/match";
import { MetadataRepo } from "@/lib/supabase/repositories/metadata.repo";
import * as TYPE from "@/lib/type";
import { whyDocuments } from "../../../../lib/contents/horenso/documents";

type ExplainNode = {
  adjustedClue: TYPE.AdjustedClue[];
  sessionFlags: TYPE.SessionFlags;
};

/**
 *
 * @param param0 回答や解説を行うノード
 * @returns
 */
export async function explainAnswerNode({
  adjustedClue,
  sessionFlags,
}: ExplainNode) {
  const contexts = [];

  contexts.push(MSG.ANSWER_STEP);
  contexts.push(MSG.SUCCESS_MESSAGE_PROMPT);
  contexts.push(MSG.SUMMARY_REQUEST_PROMPT);
  if (sessionFlags.step === 0) contexts.push(MSG.NEXT_QUESTION_PROMPT);
  contexts.push("\n");

  // 問題と答え
  contexts.push(MSG.QUESTION_AND_ANSWER_PROMPT);
  switch (sessionFlags.step) {
    case 0:
      contexts.push("question: ");
      contexts.push(MSG.FOR_REPORT_COMMUNICATION + "\n");
      contexts.push("answer: ");
      contexts.push(whoDocuments[0].pageContent + "\n");

      sessionFlags.step = 1; // ここでステップの変更
      break;
    case 1:
      contexts.push("question: ");
      contexts.push(MSG.REPORT_REASON_FOR_LEADER + MSG.THREE_ANSWER + "\n");
      contexts.push("answer: \n");
      contexts.push(
        whyDocuments.map((doc, i) => `${i + 1}. ${doc.pageContent}`).join("\n")
      );
      break;
  }
  contexts.push("\n");

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

  return { contexts, updateSessionFlags: sessionFlags };
}
