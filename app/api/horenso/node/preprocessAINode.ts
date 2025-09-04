import { Document } from "langchain/document";
import { BaseMessage } from "@langchain/core/messages";

import { splitInputLlm } from "../lib/llm/splitInput";
import { generateHintLlm } from "../lib/llm/generateHint";
import { sortScore } from "../lib/match/lib/score";
import { evaluatedResults, messageToText } from "../lib/match/lib/utils";
import { pushLog } from "../lib/log/logBuffer";
import { requestApi } from "@/lib/api/request";
import { RunnableParallel } from "@langchain/core/runnables";
import { analyzeInput } from "../lib/llm/analyzeInput";

import * as MSG from "@/lib/contents/horenso/template";
import * as TYPE from "@/lib/type";
import { CLUE_QUERY, CLUE_TABLE } from "@/lib/contents/match";
import { embeddings } from "@/lib/llm/embedding";
import { EmbeddingService } from "@/lib/supabase/services/embedding.service";
import { SessionQuestionGradeRepo } from "@/lib/supabase/repositories/sessionQuestionGrade.repo";

// 定数
const MATCH_VALIDATE = "/api/horenso/lib/match/validate";
const MATCH_PATH = "/api/horenso/lib/match";

type AiNode = {
  messages: BaseMessage[];
  step: number;
  session: TYPE.Session;
  baseUrl: string;
  whoUseDocuments: Document<TYPE.HorensoMetadata>[];
  whyUseDocuments: Document<TYPE.HorensoMetadata>[];
};

/**
 * LLMでの処理をまとめて事前に実行するノード
 * @param param0
 * @returns
 */
export async function preprocessAiNode({
  messages,
  step,
  session,
  baseUrl,
  whoUseDocuments,
  whyUseDocuments,
}: AiNode) {
  /* ⓪ 使う変数の準備  */
  pushLog("データの準備中です...");
  // ユーザーの答え
  const userMessage = messageToText(messages, messages.length - 1);
  // 回答チェック判定を取得
  const readShouldValidate = await requestApi(baseUrl, MATCH_VALIDATE, {
    method: "GET",
  });

  // 使用するプロンプト
  let sepKeywordPrompt = "";
  let useDocuments: Document<TYPE.HorensoMetadata>[] = [];
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

  /* ① 答えの分離 と ユーザーの回答を埋め込み とベクターストア作成, グレードデータを事前に作成 */
  pushLog("回答の確認中です...");
  // 入力の分析
  const analyzeInputResultPromise = analyzeInput(userMessage, question);
  const [userAnswer, userVector, _] = await Promise.all([
    splitInputLlm(sepKeywordPrompt, userMessage),
    embeddings.embedQuery(userMessage),
    SessionQuestionGradeRepo.ensure(session.id, step + 1),
  ]);
  console.log("質問の分離した答え: ");
  console.log(userAnswer);

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
          },
        },
      });
  });
  const checkUserAnswers = new RunnableParallel({ steps });

  //vectorStore検索と並列に実行(全体の処理時間も計測)
  const question_id = useDocuments[0].metadata.question_id;
  console.log(" --- ");
  const start = Date.now();
  const [matchResultsMap, rawClue] = await Promise.all([
    checkUserAnswers.invoke([]), // RunnableParallel 実行
    // ベクタ検索（Service 側で throw 済み前提）
    EmbeddingService.searchByVector(
      embeddings,
      CLUE_TABLE,
      CLUE_QUERY,
      userVector,
      5,
      { question_id }
    ),
  ]);
  const end = Date.now();
  const matchResults = Object.values(matchResultsMap);
  const evaluationData: TYPE.Evaluation[] = matchResults
    .map((r) => r.evaluationData)
    .flat();

  // document 更新
  evaluatedResults(evaluationData, useDocuments);
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
  let clue: [Document<TYPE.ClueMetadata>, number][] = [];
  let getHint: string = "";
  if (!tempIsCorrect) {
    // ヒントの取得
    const sortData = sortScore(evaluationData);
    const getHintPromises = generateHintLlm(question, sortData, useDocuments);

    clue = rawClue as [Document<TYPE.ClueMetadata>, number][];
    getHint = await getHintPromises;
    console.log("質問1のヒント: \n" + getHint);
  }

  // 入力分析
  const analyzeInputResult = await analyzeInputResultPromise;
  console.log(analyzeInputResult);
  // 分類
  const match = analyzeInputResult.match(
    /入力意図の分類:\s*(質問|回答|冗談|その他)/
  );
  const category = match ? match[1] : "";
  console.log("入力意図の分類: " + category);

  pushLog("返答の生成中です...");
  return { evaluationData, clue, getHint, category };
}
