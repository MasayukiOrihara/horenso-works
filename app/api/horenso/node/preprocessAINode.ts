import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";

import * as MSG from "../contents/messages";
import * as Utils from "../lib/utils";
import { matchAnswerOpenAi } from "../lib/match";
import {
  QAEntry,
  QAMetadata,
  UsedEntry,
  UserAnswerEvaluation,
} from "@/lib/type";
import { embeddings, jsonParser, OpenAi } from "@/lib/models";
import { readJson } from "../../chat/utils";
import { semanticFilePath, timestamp } from "@/lib/path";

type AiNode = {
  messages: BaseMessage[];
  usedEntry: UsedEntry[];
  step: number;
  host: string;
  whoUseDocuments: Document<Record<string, any>>[];
  whyUseDocuments: Document<Record<string, any>>[];
};

type SemanticData = {
  id: string;
  answer: string;
  reason: string;
  metadata: {
    parentId: string;
    question_id: string;
    timestamp: string; // ISO形式の日時
    source: "admin" | "user" | "bot"; // 必要に応じてenum化も可能
  };
};

/**
 * LLMでの処理をまとめて事前に実行するノード
 * @param param0
 * @returns
 */
export async function preprocessAiNode({
  messages,
  usedEntry,
  step,
  host,
  whoUseDocuments,
  whyUseDocuments,
}: AiNode) {
  // ユーザーの答え
  const userMessage = Utils.messageToText(messages, messages.length - 1);

  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = Utils.writeQaEntriesQuality(usedEntry, -0.1, host);
  // 埋め込み作成用にデータをマップ
  const qaDocuments: Document<QAMetadata>[] = qaList.map((qa) => ({
    pageContent: qa.userAnswer,
    metadata: {
      hint: qa.hint,
      id: qa.id,
      ...qa.metadata,
    },
  }));

  // 使用するプロンプト
  let sepKeywordPrompt = "";
  let useDocuments: Document[] = [];
  let k = 1;
  let allTrue = false;
  let question = "";
  let currentAnswer = "";
  switch (step) {
    case 0:
      sepKeywordPrompt = MSG.KEYWORD_EXTRACTION_PROMPT;
      useDocuments = whoUseDocuments;
      question = MSG.FOR_REPORT_COMMUNICATION;
      currentAnswer = whoUseDocuments
        .map((doc, i) => `${i + 1}. ${doc.pageContent}`)
        .join("\n");
      break;
    case 1:
      sepKeywordPrompt = MSG.CLAIM_EXTRACTION_PROMPT;
      useDocuments = whyUseDocuments;
      k = 3;
      allTrue = true;
      question = MSG.REPORT_REASON_FOR_LEADER + MSG.THREE_ANSWER;
      currentAnswer = whyUseDocuments
        .map((doc, i) => `${i + 1}. ${doc.pageContent}`)
        .join("\n");
      break;
  }

  /* 答えの分離 と ユーザーの回答を埋め込み */
  const [userAnswer, userEmbedding] = await Promise.all([
    Utils.splitInputLlm(sepKeywordPrompt, userMessage),
    embeddings.embedQuery(userMessage),
  ]);
  console.log("質問の分離した答え: " + userAnswer);

  // 答えの模索
  const prompt = PromptTemplate.fromTemplate(
    MSG.JUDGE_ANSWER_SEMANTIC_MATCH_PROMPT
  );
  const semanticJudgePromises = userAnswer.map((answer) =>
    prompt.pipe(OpenAi).pipe(jsonParser).invoke({
      question: question,
      current_answer: currentAnswer,
      user_answer: answer,
      format_instructions: jsonParser.getFormatInstructions(),
    })
  );

  // ベクトルストア準備 + 比較
  const vectorStore = await Utils.cachedVectorStore(qaDocuments);
  console.log("QA Listベクトルストア設置完了");
  const qaEmbeddingsPromises = vectorStore.similaritySearchVectorWithScore(
    userEmbedding,
    5
  );

  /* 曖昧回答の更新 */
  const semanticJudge = await Promise.all(semanticJudgePromises);

  // あいまい回答jsonの読み込み
  let semanticList = readJson(semanticFilePath(host));
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
    semanticList = readJson(semanticFilePath(host)); // 戻し
  }
  fs.writeFileSync(
    semanticFilePath(host),
    JSON.stringify(semanticList, null, 2)
  );
  // console.dir(semanticList, { depth: null });

  /* 正解チェック(OpenAi埋め込みモデル使用) */
  const data: UserAnswerEvaluation[] = [];
  const matchResults = await Promise.all(
    userAnswer.map((answer) =>
      matchAnswerOpenAi({
        userAnswer: answer,
        documents: useDocuments,
        topK: k,
        allTrue: allTrue,
        semantic: semanticList,
      })
    )
  );
  const userAnswerDatas = matchResults.map((r) => r.userAnswerDatas);
  const matched = matchResults.map((r) => r.isAnswerCorrect);
  console.log("\n OpenAI Embeddings チェック完了 \n ---");

  // ヒントの取得
  const top = Utils.sortScore(data);
  const getHintPromises = Utils.generateHintLlm(
    MSG.GUIDED_ANSWER_PROMPT,
    question,
    top
  );

  const qaEmbeddings = await qaEmbeddingsPromises;
  const getHint = await getHintPromises;
  console.log("質問1のヒント: \n" + getHint);

  return { userAnswerDatas, matched, qaEmbeddings, getHint };
}
