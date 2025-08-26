import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";

import * as MSG from "../contents/messages";
import { HorensoMetadata, QADocumentMetadata, QAEntry } from "@/lib/type";
import { embeddings } from "@/lib/llm/models";

import {
  notCrrectFilePath,
  qaEntriesFilePath,
  semanticFilePath,
} from "@/lib/path";
import { splitInputLlm } from "../lib/llm/splitInput";
import { generateHintLlm } from "../lib/llm/generateHint";
import { sortScore } from "../lib/match/lib/score";
import { cachedVectorStore } from "../lib/match/lib/vectorStore";
import { evaluatedResults, messageToText } from "../lib/utils";
import { pushLog } from "../lib/log/logBuffer";
import { readJson } from "@/lib/file/read";
import { requestApi } from "@/lib/api/request";
import { RunnableParallel } from "@langchain/core/runnables";
import { buildQADocuments } from "../lib/entry";
import { analyzeInput } from "../lib/llm/analyzeInput";
import { Evaluation } from "../lib/match/route";

// 定数
const MATCH_VALIDATE = "/api/horenso/lib/match/validate";
const MATCH_PATH = "/api/horenso/lib/match";

type AiNode = {
  messages: BaseMessage[];
  step: number;
  baseUrl: string;
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
  step,
  baseUrl,
  whoUseDocuments,
  whyUseDocuments,
}: AiNode) {
  /* ⓪ 使う変数の準備  */
  pushLog("データの準備中です...");
  // ユーザーの答え
  const userMessage = messageToText(messages, messages.length - 1);
  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = readJson(qaEntriesFilePath());
  // 埋め込み作成用にデータをマップ
  const qaDocuments = buildQADocuments(qaList, step);
  // あいまい回答jsonの読み込み
  const semanticList = readJson(semanticFilePath());
  const notCorrectList = readJson(notCrrectFilePath());
  // 回答チェック判定を取得
  const readShouldValidate = await requestApi(baseUrl, MATCH_VALIDATE, {
    method: "GET",
  });

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
  // 入力の分析
  const analyzeResultPromise = analyzeInput(userMessage, question);
  const [userAnswer, userEmbedding, vectorStore] = await Promise.all([
    splitInputLlm(sepKeywordPrompt, userMessage),
    embeddings.embedQuery(userMessage),
    cachedVectorStore(qaDocuments),
  ]);
  console.log("質問の分離した答え: ");
  console.log(userAnswer);
  console.log(" --- ");

  /* ② 正解チェック(OpenAi埋め込みモデル使用) ベクトルストア準備 + 比較 */
  pushLog("正解チェックを行っています...");
  // langchain の並列処理を利用
  const steps: Record<string, () => Promise<unknown>> = {};
  userAnswer.forEach((answer, i) => {
    steps[`checkAnswer_${i}`] = async () =>
      requestApi(baseUrl, MATCH_PATH, {
        method: "POST",
        body: {
          matchAnswerArgs: {
            userAnswer: answer,
            documents: useDocuments,
            topK: k,
            allTrue,
            shouldValidate,
            semanticList,
            notCorrectList,
          },
        },
      });
  });
  const checkUserAnswers = new RunnableParallel({ steps });

  //vectorStore検索と並列に実行(全体の処理時間も計測)
  const start = Date.now();
  const [matchResultsMap, rawQaEmbeddings] = await Promise.all([
    checkUserAnswers.invoke([]), // RunnableParallel 実行
    vectorStore.similaritySearchVectorWithScore(userEmbedding, 5),
  ]);
  const end = Date.now();
  const matchResults = Object.values(matchResultsMap);
  const evaluationData: Evaluation[] = matchResults
    .map((r) => r.evaluationData)
    .flat();

  // document 更新
  evaluatedResults(evaluationData, useDocuments);

  console.log("\n");
  console.log(`処理時間(ms): ${end - start} ms`);
  console.log(`OpenAI Embeddings チェック完了 \n ---`);

  /* ③ ヒントの取得（正解していたときは飛ばす） */
  pushLog("ヒントの準備中です...");
  // 正解判定
  const tempIsCorrect =
    allTrue === true
      ? useDocuments.every((doc) => doc.metadata.isMatched)
      : useDocuments.some((doc) => doc.metadata.isMatched);

  // ヒントの判定
  let qaEmbeddings: [Document<QADocumentMetadata>, number][] = [];
  let getHint: string = "";
  if (!tempIsCorrect) {
    // ヒントの取得
    const sortData = sortScore(evaluationData);
    const getHintPromises = generateHintLlm(question, sortData, useDocuments);

    qaEmbeddings = rawQaEmbeddings as [Document<QADocumentMetadata>, number][];
    getHint = await getHintPromises;
    console.log("質問1のヒント: \n" + getHint);
  }

  const analyzeResult = await analyzeResultPromise;
  console.log(analyzeResult);
  pushLog("返答の生成中です...");
  return { evaluationData, qaEmbeddings, getHint, analyzeResult };
}
