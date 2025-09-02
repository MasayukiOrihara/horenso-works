import { Document } from "langchain/document";
import { v4 as uuidv4 } from "uuid";

import { AdjustedClue, ClueMetadata } from "@/lib/type";
import { deleteOldCluelist, updateMetadataSupabase } from "./supabase";

/** clue 新規作成 */
export const generateClue = (
  userAnswer: string,
  question_id: string
): Document<ClueMetadata> => {
  return {
    pageContent: userAnswer,
    metadata: {
      id: uuidv4(),
      question_id: question_id,
      clue: "",
      quality: 0.5,
      source: "bot",
    },
  };
};

/** clue の quality の更新 */
export function updateClueQuality(adjustedClue: AdjustedClue[], qual: number) {
  const update: AdjustedClue[] = [];

  // 何もなければ空で返す
  if (!adjustedClue) {
    return update;
  }

  // 値の更新
  for (const clue of adjustedClue) {
    const correntQuality = clue.quality;
    const newQuality = Math.min(1.0, Math.max(0.0, correntQuality + qual));

    clue.quality = newQuality;
    update.push(clue);
  }

  return update;
}

/* clue の更新関数 */
export async function updateClueChat(clueId: string, response: string) {
  // 数字を伏字にする（過去返答に引っ張られることが多いため）
  const censored = response.replace(/\d/g, "*");

  // DB の更新
  const METADATA_CLUE_KEY = "clue";
  await updateMetadataSupabase(clueId, METADATA_CLUE_KEY, censored);
  // ついでにリセット
  await deleteOldCluelist();
}
