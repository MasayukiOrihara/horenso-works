import { Document } from "langchain/document";
import { PromptTemplate } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

import * as MSG from "../../contents/messages";
import { embeddings, jsonParser, OpenAi } from "@/lib/models";
import { readJson } from "@/app/api/chat/utils";
import { semanticFilePath, timestamp } from "@/lib/path";
import { SemanticAnswerData, SemanticData } from "@/lib/type";
import { buildSupportDocs, cachedVectorStore } from "../utils";
import { DocumentInterface } from "@langchain/core/documents";

/** ユーザー回答が答えに意味的に近いかLLMに判断させてJSON形式で出力する */
export const judgeSemanticMatch = async (
  userAnswer: string,
  documents: Document<Record<string, any>>[]
) => {
  const question = documents[0].metadata.question;
  const currentAnswer = documents
    .map((doc, i) => `${i + 1}. ${doc.pageContent}`)
    .join("\n");

  const prompt = PromptTemplate.fromTemplate(
    MSG.JUDGE_ANSWER_SEMANTIC_MATCH_PROMPT
  );
  const semanticJudge = await prompt.pipe(OpenAi).pipe(jsonParser).invoke({
    question: question,
    current_answer: currentAnswer,
    user_answer: userAnswer,
    format_instructions: jsonParser.getFormatInstructions(),
  });

  return semanticJudge;
};

/** LLM の出力から semantic-match-answer.jsonを更新する処理 */
export function updateSemanticMatch(
  host: string,
  semanticJudge: Record<string, any>[],
  step: number
) {
  // あいまい回答jsonの読み込み
  const semanticList = readJson(semanticFilePath(host));
  // ※※ semanticJudgeはopenAiに直接出力させたオブジェクトなので取り扱いがかなり怖い
  try {
    for (const raw of semanticJudge) {
      if (raw.metadata.parentId && !(raw.metadata.parentId === "")) {
        const data: SemanticData = {
          id: uuidv4(),
          answer: raw.answer,
          reason: raw.reason,
          metadata: {
            parentId: raw.metadata.parentId,
            question_id: `${step + 1}`,
            timestamp: timestamp,
            source: raw.metadata.source as "user" | "bot" | "admin", // 型が合うように明示
          },
        };
        console.log("曖昧回答の出力:");
        console.log(data);
        switch (step) {
          case 0:
            semanticList.who[raw.metadata.parentId - 1].splice(
              semanticList.why[raw.metadata.parentId - 1].length,
              0,
              data
            );
            break;
          case 1:
            semanticList.why[raw.metadata.parentId - 1].splice(
              semanticList.why[raw.metadata.parentId - 1].length,
              0,
              data
            );
            break;
        }
      }
    }
  } catch (error) {
    console.log("semanticList は更新できませんでした。" + error);
  }
  fs.writeFileSync(
    semanticFilePath(host),
    JSON.stringify(semanticList, null, 2)
  );
  // console.dir(semanticList, { depth: null });
}

/** あいまい正解表を読み込んでその中で類似度最大スコアを返す */
export const getMaxScoreSemanticMatch = async (
  similarity: DocumentInterface<Record<string, any>>,
  semanticList: SemanticAnswerData,
  userAnswer: string
) => {
  // あいまい回答jsonの読み込み
  let phrases: string[] = [];
  const id = similarity.metadata.parentId;
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
