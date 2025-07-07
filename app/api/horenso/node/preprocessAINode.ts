import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";

import * as MSG from "../contents/messages";
import { matchAnswerOpenAi } from "../lib/match/match";
import {
  HorensoMetadata,
  QADocumentMetadata,
  QAEntry,
  UsedEntry,
} from "@/lib/type";
import { embeddings } from "@/lib/models";
import { readJson } from "../../chat/utils";
import { semanticFilePath } from "@/lib/path";
import { splitInputLlm } from "../lib/llm/splitInput";
import { generateHintLlm } from "../lib/llm/generateHint";
import { sortScore } from "../lib/match/score";
import { cachedVectorStore } from "../lib/match/vectorStore";
import { messageToText } from "../lib/utils";
import { writeQaEntriesQuality } from "../lib/entry";

type AiNode = {
  messages: BaseMessage[];
  usedEntry: UsedEntry[];
  step: number;
  host: string;
  whoUseDocuments: Document<HorensoMetadata>[];
  whyUseDocuments: Document<HorensoMetadata>[];
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
  const userMessage = messageToText(messages, messages.length - 1);

  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = writeQaEntriesQuality(usedEntry, -0.1, host);
  // 埋め込み作成用にデータをマップ
  const qaDocuments: Document<QADocumentMetadata>[] = qaList.map((qa) => ({
    pageContent: qa.userAnswer,
    metadata: {
      hint: qa.hint,
      id: qa.id,
      ...qa.metadata,
    },
  }));

  // 使用するプロンプト
  let sepKeywordPrompt = "";
  let useDocuments: Document<HorensoMetadata>[] = [];
  let k = 1;
  let allTrue = false;
  let question = "";
  switch (step) {
    case 0:
      sepKeywordPrompt = MSG.KEYWORD_EXTRACTION_PROMPT;
      useDocuments = whoUseDocuments;
      question = MSG.FOR_REPORT_COMMUNICATION;
      break;
    case 1:
      sepKeywordPrompt = MSG.CLAIM_EXTRACTION_PROMPT;
      useDocuments = whyUseDocuments;
      k = 3;
      allTrue = true;
      question = MSG.REPORT_REASON_FOR_LEADER;
      break;
  }

  /* 答えの分離 と ユーザーの回答を埋め込み */
  const [userAnswer, userEmbedding] = await Promise.all([
    splitInputLlm(sepKeywordPrompt, userMessage),
    embeddings.embedQuery(userMessage),
  ]);
  console.log("質問の分離した答え: " + userAnswer);

  // ベクトルストア準備 + 比較
  const vectorStore = await cachedVectorStore(qaDocuments);
  console.log("QA Listベクトルストア設置完了");
  const qaEmbeddingsPromises = vectorStore.similaritySearchVectorWithScore(
    userEmbedding,
    5
  );

  /* 正解チェック(OpenAi埋め込みモデル使用) */
  // あいまい回答jsonの読み込み
  const semanticList = readJson(semanticFilePath(host));
  const matchResults = await Promise.all(
    userAnswer.map((answer) =>
      matchAnswerOpenAi({
        userAnswer: answer,
        documents: useDocuments,
        topK: k,
        allTrue: allTrue,
        semanticList: semanticList,
        semanticPath: semanticFilePath(host),
      })
    )
  );
  const userAnswerDatas = matchResults.map((r) => r.userAnswerDatas).flat();
  const matched = matchResults.map((r) => r.isAnswerCorrect);
  console.log("\n OpenAI Embeddings チェック完了 \n ---");

  // ヒントの取得
  const tempIsCorrect = matched.some((result) => result === true);
  console.log(matched);
  let qaEmbeddings: [Document<QADocumentMetadata>, number][] = [];
  let getHint: string = "";
  if (!tempIsCorrect) {
    const top = sortScore(userAnswerDatas, useDocuments);
    console.log("ヒントを出すのに参照するユーザーの答え");
    console.log(top);
    const getHintPromises = generateHintLlm(question, top, useDocuments);

    const rawQaEmbeddings = await qaEmbeddingsPromises;
    qaEmbeddings = rawQaEmbeddings as [Document<QADocumentMetadata>, number][];
    getHint = await getHintPromises;
    console.log("質問1のヒント: \n" + getHint);
  }

  return { userAnswerDatas, matched, qaEmbeddings, getHint };
}
