import { BaseMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { Document } from "langchain/document";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

import {
  embeddings,
  haiku3_5_sentence,
  listParser,
  sonnet,
  strParser,
} from "@/lib/models";
import { QAEntry, UsedEntry, UserAnswerEvaluation } from "@/lib/type";
import { qaEntriesFilePath } from "@/lib/path";
import { readJson } from "../../chat/utils";

/** メッセージ形式をStringに変換する関数 */
export function messageToText(message: BaseMessage[], index: number) {
  const result =
    typeof message[index].content === "string"
      ? message[index].content
      : message[index].content
          .map((c: { type?: string; text?: string }) => c.text ?? "")
          .join("");

  return result;
}

/** vector store が既にあるかのチェック */
export async function cachedVectorStore(documents: Document[]) {
  let cachedVectorStore: MemoryVectorStore | null = null;
  let cachedDocHash = "";

  function hashDocuments(docs: Document[]): string {
    return JSON.stringify(docs); // 簡易版。正確にやるなら md5 等でハッシュ化
  }

  const currentDocHash = hashDocuments(documents);

  if (!cachedVectorStore || cachedDocHash !== currentDocHash) {
    cachedVectorStore = await MemoryVectorStore.fromDocuments(
      documents,
      embeddings
    );
    cachedDocHash = currentDocHash;
  }

  return cachedVectorStore;
}

/** LLMを利用して答えを切り分ける(haiku3.5使用) */
export const splitInputLlm = async (promptText: string, input: string) => {
  const template = promptText;
  const prompt = PromptTemplate.fromTemplate(template);
  const spritUserAnswer = await prompt
    .pipe(haiku3_5_sentence)
    .pipe(listParser)
    .invoke({
      input: input,
      format_instructions: listParser.getFormatInstructions(),
    });

  return spritUserAnswer;
};

/** データをスコア順に並べ替える */
export const sortScore = (data: UserAnswerEvaluation[]) => {
  return data
    .slice()
    .sort((a, b) => Number(b.score) - Number(a.score))
    .filter((item) => item.isAnswerCorrect === false)
    .slice(0, 1);
};

/** LLMを利用して答えを導くヒントを生成する */
export const generateHintLlm = async (
  promptText: string,
  question: string,
  top: UserAnswerEvaluation[]
) => {
  const template = promptText;
  const prompt = PromptTemplate.fromTemplate(template);
  const getHint = await prompt
    .pipe(sonnet)
    .pipe(strParser)
    .invoke({
      question: question,
      currect_answer: top.map((val) => val.currentAnswer).join(", "),
      user_answer: top.map((val) => val.userAnswer).join(", "),
    });
  return getHint;
};

/** 使用したデータからqualityの値を更新する */
export function writeQaEntriesQuality(
  usedDocuments: UsedEntry[],
  qual: number
) {
  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = readJson(qaEntriesFilePath);

  let updated: QAEntry[] = qaList;
  for (const used of usedDocuments) {
    console.log("前回のID: " + used.entry.metadata.id);
    for (const list of qaList) {
      if (used.entry.metadata.id === list.id) {
        const current = used.entry.metadata.quality ?? 0.5;
        const newQuality = Math.min(1.0, Math.max(0.0, current + qual));

        // 値の更新
        updated = qaList.map((qa) =>
          qa.id === list.id
            ? {
                ...qa,
                metadata: {
                  ...qa.metadata,
                  quality: newQuality,
                },
              }
            : qa
        );
      }
    }
  }
  return updated;
}

/** データに重みづけしたスコアを計算して出力 */
export const getRankedResults = (
  results: [Document<Record<string, any>>, number][]
) => {
  const rankedResults: UsedEntry[] = [];
  for (const [bestMatch, score] of results) {
    console.log("score: " + score + ", match: " + bestMatch.pageContent);

    // 重みづけと選出
    const qual = bestMatch.metadata.quality ?? 0.5;
    let weight = 0.8;
    switch (bestMatch.metadata.source) {
      case "bot":
        weight = 0.6;
        break;
      case "admin":
        weight = 1.4;
        break;
      case "user":
        weight = 1.0;
        break;
    }

    // 総合スコア計算（調整式は適宜チューニング）
    const sum = score * 0.6 + qual * 0.3 + weight * 0.1;
    console.log("総合スコア: " + sum + " ID: " + bestMatch.metadata.id);

    rankedResults.push({
      entry: bestMatch,
      sum: sum,
    });
  }
  return rankedResults;
};
