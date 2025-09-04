import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";

import { AdjustedClue, ClueMetadata } from "@/lib/type";
import { messageToText } from "../lib/match/lib/utils";
import { getRankedResults } from "../lib/match/lib/score";

import * as MSG from "@/lib/contents/horenso/template";
import { generateClue, updateClueQuality } from "../lib/match/lib/entry";
import { updateMetadataSupabase } from "../lib/match/lib/supabase";
import { CLUE_TABLE } from "@/lib/contents/match";
import { embeddings } from "@/lib/llm/embedding";
import { EmbeddingService } from "@/lib/supabase/services/embedding.service";

type RerankNode = {
  adjustedClue: AdjustedClue[];
  messages: BaseMessage[];
  step: number;
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
  step,
  clue,
  category,
}: RerankNode) {
  /** 前回の返答を新規 clue として追加 */
  const previousMessage = messageToText(messages, messages.length - 1);
  const newClue: Document<ClueMetadata> = generateClue(
    previousMessage,
    `${step + 1}`
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
  const newClueId = newClue.metadata.id; // 次に渡す ID 用

  /** 前回ターンの clue が役に立たなかったのでマイナス評価更新 */
  let updateAdjustedClue: AdjustedClue[] = [];
  if (!(category === "質問" || category === "冗談")) {
    // 今回の会話カテゴリーが回答系じゃない場合マイナス評価を免除
    updateAdjustedClue = updateClueQuality(adjustedClue, -0.1);
  }

  // DB 更新
  for (const adjusted of updateAdjustedClue) {
    await updateMetadataSupabase(adjusted.id, "quality", adjusted.quality);
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

  return { newClueId, selectedClue, contexts };
}
