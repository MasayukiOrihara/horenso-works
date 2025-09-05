import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";

import { AdjustedClue, ClueMetadata, SessionFlags } from "@/lib/type";
import { messageToText } from "../lib/match/lib/utils";
import { getRankedResults } from "../lib/match/lib/score";

import * as MSG from "@/lib/contents/horenso/template";
import { generateClue, updateClueQuality } from "../lib/match/lib/entry";
import { CLUE_TABLE, METADATA_QUALITY_KEY } from "@/lib/contents/match";
import { embeddings } from "@/lib/llm/embedding";
import { EmbeddingService } from "@/lib/supabase/services/embedding.service";
import { MetadataRepo } from "@/lib/supabase/repositories/metadata.repo";

type RerankNode = {
  adjustedClue: AdjustedClue[];
  messages: BaseMessage[];
  sessionFlags: SessionFlags;
  clue: [Document<ClueMetadata>, number][];
  category: string;
};

/**
 * 参考にする過去回答を選出するノード
 * @param param0
 * @returns
 */
export async function rerankNode({
  adjustedClue,
  messages,
  sessionFlags,
  clue,
  category,
}: RerankNode) {
  /** 前回の返答を新規 clue として追加 */
  const previousMessage = messageToText(messages, messages.length - 1);
  const newClue: Document<ClueMetadata> = generateClue(
    previousMessage,
    `${sessionFlags.step + 1}`
  );
  // db保存
  const r = await EmbeddingService.save(embeddings, [newClue], CLUE_TABLE);
  if (!r.ok) {
    // エラー時: 保存失敗しても内部ログのみ
    console.error(
      "保存に失敗:",
      r.error.message,
      r.error.code,
      r.error.details
    );
  }
  console.log("✅ 新規clue を データベース に保存しました。");
  sessionFlags.options.clueId = newClue.metadata.id; // 次に渡す ID 用

  /** 前回ターンの clue が役に立たなかったのでマイナス評価更新 */
  let updateAdjustedClue: AdjustedClue[] = [];
  if (!(category === "質問" || category === "冗談")) {
    // 今回の会話カテゴリーが回答系じゃない場合マイナス評価を免除
    updateAdjustedClue = updateClueQuality(adjustedClue, -0.1);
  }

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

  /** 回答に一貫性を持たせるために、ユーザーの入力に対する過去回答コンテキスト作成 */
  const contexts = [];
  contexts.push(MSG.BULLET + MSG.PAST_REPLY_HINT_PROMPT);
  contexts.push(MSG.ANSWER_EXAMPLE_PREFIX_PROMPT);

  // データ取得
  const rankedResults: AdjustedClue[] = getRankedResults(clue);

  // rankscore の高い順に並べて、上位2件を取得
  const selectedClue = rankedResults
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 2);

  // コンテキストに追加
  for (const clue of selectedClue) {
    console.log("エントリートップ2: " + clue.id);

    const response = clue.clue.replace(/(\r\n|\n|\r)/g, "");
    contexts.push(`${response}\n --- \n`);
  }
  contexts.push("\n");

  return { updateSessionFlags: sessionFlags, selectedClue, contexts };
}
