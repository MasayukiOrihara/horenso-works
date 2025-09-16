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
import { MATCH_PATH } from "@/lib/api/path";
import * as ERR from "@/lib/message/error";
import * as LOG from "@/lib/message/log";

type AiNode = {
  messages: BaseMessage[];
  sessionFlags: TYPE.SessionFlags;
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
  sessionFlags,
  whoUseDocuments,
  whyUseDocuments,
}: AiNode) {
  /* ⓪ 使う変数の準備  */
  pushLog(LOG.PROCESS_LOG_1);
  // ユーザーの答え
  const userMessage = messageToText(messages, messages.length - 1);

  // 使用するプロンプト
  let sepKeywordPrompt = "";
  let useDocuments: Document<TYPE.HorensoMetadata>[] = [];
  let k = 1;
  let allTrue = false;
  let question = "";
  switch (sessionFlags.step) {
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

  /* ① 答えの分離 と ユーザーの回答を埋め込み とベクターストア作成, グレードデータを事前に作成 */
  pushLog(LOG.PROCESS_LOG_2);
  // 入力の分析
  const analyzeInputResultPromise = analyzeInput(
    userMessage,
    question,
    sessionFlags
  );
  let userAnswer: string[] = []; // 入力を分離し答えに変換
  let userVector: number[] = []; // 入力のベクターデータ
  try {
    [userAnswer, userVector] = await Promise.all([
      splitInputLlm(sepKeywordPrompt, userMessage),
      embeddings.embedQuery(userMessage),
      SessionQuestionGradeRepo.ensure(
        sessionFlags.sessionId,
        sessionFlags.step + 1
      ),
    ]);
  } catch (error) {
    console.error(ERR.PREPROCESS_AI_USERANSWER_ERROR);
    throw error; // 上に投げる
  }
  console.log("質問の分離した答え: ");
  console.log(userAnswer);

  /* ② 正解チェック(OpenAi埋め込みモデル使用) ベクトルストア準備 + 比較 */
  pushLog(LOG.PROCESS_LOG_3);
  console.log(" --- ");
  // langchain の並列処理を利用
  const steps: Record<string, () => Promise<unknown>> = {};
  let evaluationData: TYPE.Evaluation[] = [];
  let clue: [Document<TYPE.ClueMetadata>, number][] = [];

  const start = Date.now(); // 計測開始
  try {
    userAnswer.forEach((answer, i) => {
      steps[`checkAnswer_${i}`] = async () =>
        requestApi(sessionFlags.baseUrl!, MATCH_PATH, {
          method: "POST",
          body: {
            matchAnswerArgs: {
              userAnswer: answer,
              documents: useDocuments,
              topK: k,
              allTrue,
              sessionFlags: sessionFlags,
            },
          },
        });
    });
    const checkUserAnswers = new RunnableParallel({ steps });

    //vectorStore検索と並列に実行(全体の処理時間も計測)
    const questionId = useDocuments[0].metadata.questionId;
    const [matchResultsMap, rawClue] = await Promise.all([
      checkUserAnswers.invoke([]), // RunnableParallel 実行
      // ベクタ検索（Service 側で throw 済み前提）
      EmbeddingService.searchByVector(
        embeddings,
        CLUE_TABLE,
        CLUE_QUERY,
        userVector,
        5,
        { questionId }
      ),
    ]);
    // 評価データ
    const matchResults = Object.values(matchResultsMap);
    evaluationData = matchResults.map((r) => r.evaluationData).flat();
    // 正解データ
    const currectStatusArr = matchResults.map((r) => r.currectStatus).flat();
    const currectStatus = [...new Set(currectStatusArr)];

    const existingIds = new Set(
      sessionFlags.currectStatus.map((s) => s.expectedAnswerId)
    );
    const newOnes = currectStatus.filter(
      (s) => !existingIds.has(s.expectedAnswerId)
    );
    // 追加
    sessionFlags.currectStatus = [...sessionFlags.currectStatus, ...newOnes];

    console.log(sessionFlags.currectStatus);

    // document 更新
    evaluatedResults(evaluationData, useDocuments);
    // 応答例
    clue = rawClue as [Document<TYPE.ClueMetadata>, number][];
  } catch (error) {
    console.error(ERR.PREPROCESS_AI_CHECKANSWER_ERROR);
    throw error; // 上に投げる
  }
  const end = Date.now(); // 計測終了
  console.log(`処理時間(ms): ${end - start} ms`);
  console.log(`OpenAI Embeddings チェック完了 \n ---`);

  /* ③ ヒントの取得（正解していたときは飛ばす） */
  pushLog(LOG.PROCESS_LOG_4);
  let getHint: string = ""; // ヒントの取得
  let category: string = ""; // 入力カテゴリーの主塔
  try {
    // 正解判定
    const tempIsCorrect =
      allTrue === true
        ? useDocuments.every((doc) => doc.metadata.isMatched)
        : useDocuments.some((doc) => doc.metadata.isMatched);

    // ヒントの取得
    let hintPromises: ReturnType<typeof generateHintLlm> | undefined;
    if (!tempIsCorrect) {
      const sortData = sortScore(evaluationData);
      hintPromises = generateHintLlm(question, sortData, useDocuments);
    }

    // ヒント
    if (hintPromises) getHint = await hintPromises;
    // 入力分析
    const analyzeInputResult = await analyzeInputResultPromise;

    // 分類
    const match = analyzeInputResult.match(
      /入力意図の分類:\s*(質問|回答|冗談|その他)/
    );
    category = match ? match[1] : "その他";

    console.log("質問1のヒント: \n" + getHint);
    console.log(analyzeInputResult);
    console.log("入力意図の分類切り出し: " + category);
  } catch (error) {
    console.error(ERR.PREPROCESS_AI_HINT_ERROR);
    throw error; // 上
  }

  pushLog(LOG.PROCESS_LOG_5);
  return {
    evaluationData,
    clue,
    getHint,
    category,
    tempSessionFlags: sessionFlags,
  };
}
