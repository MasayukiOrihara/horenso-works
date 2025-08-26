import { Document } from "langchain/document";
import { PromptTemplate } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

import * as MSG from "../../contents/messages";
import { jsonParser, OpenAi } from "@/lib/llm/models";
import { timestamp } from "@/lib/path";
import {
  HorensoMetadata,
  SemanticAnswerData,
  SemanticAnswerEntry,
} from "@/lib/type";
import { cachedVectorStore } from "./vectorStore";
import { FuzzyScore, UserAnswerEmbedding } from "./route";

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
  let data: SemanticAnswerEntry;
  try {
    const semanticJudge = await prompt.pipe(OpenAi).pipe(jsonParser).invoke({
      question: question,
      current_answer: currentAnswer,
      user_answer: userAnswer,
      format_instructions: jsonParser.getFormatInstructions(),
    });

    data = {
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
  } catch (error) {
    // ダメだったら空のデータを返す
    console.error("JSONパース失敗", error);
    data = {
      id: uuidv4(),
      answer: userAnswer,
      reason: "JSONパース失敗",
      metadata: {
        parentId: "",
        question_id: "",
        timestamp: timestamp,
        source: "bot",
      },
    };
  }
  console.log("曖昧回答の出力:");
  console.log(data);

  return data;
};

/** LLM の出力から semantic-match-answer.jsonを更新する処理 */
export function updateSemanticMatch(
  semanticJudge: SemanticAnswerEntry,
  semanticList: SemanticAnswerData,
  semanticPath: string,
  question_id: string
) {
  let updated = false;
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
            semanticList.who[parentId - 1].length,
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
  input: UserAnswerEmbedding,
  similarity: Document<HorensoMetadata>,
  semanticList: SemanticAnswerData
) => {
  let fuzzyScore: FuzzyScore | null = null;

  // あいまい回答jsonの読み込み
  let phrases: FuzzyScore[] = [];
  const id = Number(similarity.metadata.parentId);
  switch (similarity.metadata.question_id) {
    case "1":
      if (Array.isArray(semanticList.who) && semanticList.who.length > 0) {
        phrases = semanticList.who[id - 1].map((e) => ({
          id: e.id,
          score: 0,
          nearAnswer: e.answer,
          reason: e.reason,
          correct: "unknown",
        }));
      }
      break;
    case "2":
      if (Array.isArray(semanticList.why) && semanticList.why.length > 0) {
        phrases = semanticList.why[id - 1].map((e) => ({
          id: e.id,
          score: 0,
          nearAnswer: e.answer,
          reason: e.reason,
          correct: "unknown",
        }));
      }
      break;
  }

  if (phrases.length > 0) {
    // ベクターストアを作成
    const docs = buildSupportDocs(phrases, String(id));
    const supportVectorStore = await cachedVectorStore(docs);

    // 最大スコアを取得
    const maxSimilarity =
      await supportVectorStore.similaritySearchVectorWithScore(
        input.embedding,
        1
      );
    const max = maxSimilarity[0];
    fuzzyScore = {
      id: max?.[0].metadata.id,
      score: max?.[1],
      nearAnswer: max?.[0].pageContent,
      reason: max?.[0].metadata.reason,
      correct: "unknown",
    };
  }

  return fuzzyScore;
};

// 例：サポート用フレーズを事前にまとめる
const buildSupportDocs = (
  phrases: FuzzyScore[],
  parentId: string
): Document[] =>
  phrases.map(
    (phrases) =>
      new Document({
        pageContent: phrases.nearAnswer!,
        metadata: { id: phrases.id, parentId, reason: phrases.reason },
      })
  );
