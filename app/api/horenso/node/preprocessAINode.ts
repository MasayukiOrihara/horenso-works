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
import { getBaseUrl, notCrrectFilePath, semanticFilePath } from "@/lib/path";
import { splitInputLlm } from "../lib/llm/splitInput";
import { generateHintLlm } from "../lib/llm/generateHint";
import { sortScore } from "../lib/match/score";
import { cachedVectorStore } from "../lib/match/vectorStore";
import { messageToText } from "../lib/utils";
import { writeQaEntriesQuality } from "../lib/entry";
import { pushLog } from "../lib/log/logBuffer";
import { judgeTalk } from "../lib/llm/judgeTalk";
import { getShouldValidateApi } from "@/lib/api/serverApi";

type AiNode = {
  messages: BaseMessage[];
  usedEntry: UsedEntry[];
  step: number;
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
  whoUseDocuments,
  whyUseDocuments,
}: AiNode) {
  /* ⓪ 使う変数の準備  */
  pushLog("データの準備中です...");
  // ユーザーの答え
  const userMessage = messageToText(messages, messages.length - 1);
  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = writeQaEntriesQuality(usedEntry, -0.1);
  // 埋め込み作成用にデータをマップ
  const qaDocuments: Document<QADocumentMetadata>[] = qaList.map((qa) => ({
    pageContent: qa.userAnswer,
    metadata: {
      hint: qa.hint,
      id: qa.id,
      ...qa.metadata,
    },
  }));
  // あいまい回答jsonの読み込み
  const semanticList = readJson(semanticFilePath());
  const notCorrectList = readJson(notCrrectFilePath());
  const readShouldValidate = await getShouldValidateApi();
  console.log(readShouldValidate);

  // 使用するプロンプト
  let sepKeywordPrompt = "";
  let useDocuments: Document<HorensoMetadata>[] = [];
  let k = 1;
  let allTrue = false;
  let shouldValidate = false;
  let question = "";
  switch (step) {
    case 0:
      sepKeywordPrompt = MSG.KEYWORD_EXTRACTION_PROMPT;
      useDocuments = whoUseDocuments;
      question = MSG.FOR_REPORT_COMMUNICATION;
      shouldValidate = readShouldValidate.who ?? false;
      break;
    case 1:
      sepKeywordPrompt = MSG.CLAIM_EXTRACTION_PROMPT;
      useDocuments = whyUseDocuments;
      k = 3;
      allTrue = true;
      question = MSG.REPORT_REASON_FOR_LEADER;
      shouldValidate = readShouldValidate.why ?? true;
      break;
  }

  /* ① 答えの分離 と ユーザーの回答を埋め込み とベクターストア作成 */
  pushLog("回答の確認中です...");
  const [userAnswer, userEmbedding, vectorStore, judgeResoult] =
    await Promise.all([
      splitInputLlm(sepKeywordPrompt, userMessage),
      embeddings.embedQuery(userMessage),
      cachedVectorStore(qaDocuments),
      judgeTalk(userMessage, question),
    ]);
  console.log("質問の分離した答え: ");
  console.log(userAnswer);
  console.log(" --- ");
  console.log(judgeResoult);

  /* ② 正解チェック(OpenAi埋め込みモデル使用) ベクトルストア準備 + 比較 */
  pushLog("正解チェックを行っています...");
  const [matchResults, rawQaEmbeddings] = await Promise.all([
    Promise.all(
      userAnswer.map((answer) =>
        matchAnswerOpenAi({
          userAnswer: answer,
          documents: useDocuments,
          topK: k,
          allTrue: allTrue,
          shouldValidate: shouldValidate,
          semanticList: semanticList,
          notCorrectList: notCorrectList,
        })
      )
    ),
    vectorStore.similaritySearchVectorWithScore(userEmbedding, 5),
  ]);
  const userAnswerDatas = matchResults.map((r) => r.userAnswerDatas).flat();
  const matched = matchResults.map((r) => r.isAnswerCorrect);
  console.log("\n OpenAI Embeddings チェック完了 \n ---");
  console.log("ユーザーの答えデータ");
  console.log(userAnswerDatas);

  /* ③ ヒントの取得（正解していたときは飛ばす） */
  pushLog("ヒントの準備中です...");
  const tempIsCorrect = matched.some((result) => result === true);
  let qaEmbeddings: [Document<QADocumentMetadata>, number][] = [];
  let getHint: string = "";
  if (!tempIsCorrect) {
    const top = sortScore(userAnswerDatas, useDocuments);
    const getHintPromises = generateHintLlm(question, top, useDocuments);

    qaEmbeddings = rawQaEmbeddings as [Document<QADocumentMetadata>, number][];
    getHint = await getHintPromises;
    console.log("質問1のヒント: \n" + getHint);
  }

  return { userAnswerDatas, matched, qaEmbeddings, getHint, judgeResoult };
}
