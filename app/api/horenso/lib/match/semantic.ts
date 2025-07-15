import { Document } from "langchain/document";
import { PromptTemplate } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

import * as MSG from "../../contents/messages";
import { embeddings, jsonParser, OpenAi } from "@/lib/models";
import { semanticFilePath, timestamp } from "@/lib/path";
import {
  HorensoMetadata,
  SemanticAnswerData,
  SemanticAnswerEntry,
} from "@/lib/type";
import { cachedVectorStore } from "./vectorStore";

/** ユーザー回答が答えに意味的に近いかLLMに判断させてJSON形式で出力する */
export const judgeSemanticMatch = async (
  userAnswer: string,
  documents: Document<HorensoMetadata>[]
) => {
  const question = documents[0].metadata.question;
  // 問題の回答（ややこしいですが正解が複数の場合、すべての正解（多）×ユーザーの回答（単）で比較してます）
  const currentAnswer = documents
    .map((doc, i) => `${i + 1}. ${doc.pageContent}`)
    .join("\n");

  const prompt = PromptTemplate.fromTemplate(
    MSG.JUDGE_ANSWER_SEMANTIC_MATCH_PROMPT
  );
  // ※※ semanticJudgeはopenAiに直接出力させたオブジェクトなので取り扱いがかなり怖い
  const semanticJudge = await prompt.pipe(OpenAi).pipe(jsonParser).invoke({
    question: question,
    current_answer: currentAnswer,
    user_answer: userAnswer,
    format_instructions: jsonParser.getFormatInstructions(),
  });

  const data: SemanticAnswerEntry = {
    id: uuidv4(),
    answer: semanticJudge.answer,
    reason: semanticJudge.reason,
    metadata: {
      parentId: String(semanticJudge.metadata.parentId),
      question_id: "",
      timestamp: timestamp,
      source: semanticJudge.metadata.source as "user" | "bot" | "admin", // 型が合うように明示
    },
  };
  console.log("曖昧回答の出力:");
  console.log(data);

  return data;
};

/** LLM の出力から semantic-match-answer.jsonを更新する処理 */
export function updateSemanticMatch(
  semanticJudge: SemanticAnswerEntry,
  semanticList: SemanticAnswerData,
  question_id: string
) {
  let updated = false;
  const semanticPath = semanticFilePath();
  try {
    if (
      semanticJudge.metadata.parentId &&
      !(semanticJudge.metadata.parentId === "")
    ) {
      const parentId = Number(semanticJudge.metadata.parentId);
      semanticJudge.metadata.question_id = question_id;
      switch (question_id) {
        case "1":
          semanticList.who[parentId - 1].splice(
            semanticList.why[parentId - 1].length,
            0,
            semanticJudge
          );
          break;
        case "2":
          semanticList.why[parentId - 1].splice(
            semanticList.why[parentId - 1].length,
            0,
            semanticJudge
          );
          break;
      }
    }
  } catch (error) {
    console.log("semanticList は更新できませんでした。" + error);
    return updated;
  }
  fs.writeFileSync(semanticPath, JSON.stringify(semanticList, null, 2));
  updated = true;
  return updated;
}

/** あいまい正解表を読み込んでその中で類似度最大スコアを返す */
export const getMaxScoreSemanticMatch = async (
  similarity: Document<HorensoMetadata>,
  semanticList: SemanticAnswerData,
  userAnswer: string
) => {
  // あいまい回答jsonの読み込み
  let phrases: { id: string; answer: string }[] = [];
  const id = Number(similarity.metadata.parentId);
  switch (similarity.metadata.question_id) {
    case "1":
      if (Array.isArray(semanticList.who) && semanticList.who.length > 0) {
        phrases = semanticList.who[id - 1].map((e) => ({
          id: e.id,
          answer: e.answer,
        }));
      }
      break;
    case "2":
      if (Array.isArray(semanticList.why) && semanticList.why.length > 0) {
        phrases = semanticList.why[id - 1].map((e) => ({
          id: e.id,
          answer: e.answer,
        }));
      }
      break;
  }

  if (phrases.length > 0) {
    const docs = buildSupportDocs(phrases, String(id));
    const supportVectorStore = await cachedVectorStore(docs);
    const userEmbedding = await embeddings.embedQuery(userAnswer);

    // 最大スコアを取得
    const maxSimilarity =
      await supportVectorStore.similaritySearchVectorWithScore(
        userEmbedding,
        1
      );
    const score = maxSimilarity[0]?.[1] ?? 0;
    const semanticId = maxSimilarity[0]?.[0].metadata.id ?? "";
    return { id: semanticId, score: score };
  }

  return { id: "", score: 0 };
};

// 例：サポート用フレーズを事前にまとめる
const buildSupportDocs = (
  phrases: { id: string; answer: string }[],
  parentId: string
): Document[] =>
  phrases.map(
    (phrases) =>
      new Document({
        pageContent: phrases.answer,
        metadata: { id: phrases.id, parentId },
      })
  );

/** リスト ID から理由を検索 */
export const getSemanticMatchReason = (
  similarity: Document<HorensoMetadata>,
  semanticList: SemanticAnswerData,
  semanticId: string
) => {
  const id = Number(similarity.metadata.parentId);
  let item;
  switch (similarity.metadata.question_id) {
    case "1":
      if (Array.isArray(semanticList.who) && semanticList.who.length > 0) {
        item = semanticList.who[id - 1].find((d) => d.id === semanticId);
      }
      break;
    case "2":
      if (Array.isArray(semanticList.why) && semanticList.why.length > 0) {
        item = semanticList.why[id - 1].find((d) => d.id === semanticId);
      }
      break;
  }
  return item?.reason ?? "";
};
