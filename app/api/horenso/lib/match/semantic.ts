import { Document } from "langchain/document";
import { PromptTemplate } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

import * as MSG from "../../contents/messages";
import { embeddings, jsonParser, OpenAi } from "@/lib/models";
import { timestamp } from "@/lib/path";
import {
  HorensoMetadata,
  SemanticAnswerData,
  SemanticAnswerEntry,
} from "@/lib/type";
import { DocumentInterface } from "@langchain/core/documents";
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
  let phrases: string[] = [];
  const id = Number(similarity.metadata.parentId);
  switch (similarity.metadata.question_id) {
    case "1":
      phrases = semanticList.who[id - 1].map((e) => e.answer);
      break;
    case "2":
      phrases = semanticList.why[id - 1].map((e) => e.answer);
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
    return maxSimilarity[0]?.[1] ?? 0;
  }

  return 0;
};

// 例：サポート用フレーズを事前にまとめる
const buildSupportDocs = (phrases: string[], parentId: string): Document[] =>
  phrases.map(
    (text, index) =>
      new Document({
        pageContent: text,
        metadata: { id: `${parentId}_${index}`, parentId },
      })
  );
