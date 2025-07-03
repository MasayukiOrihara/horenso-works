import { Document } from "langchain/document";

import {
  QAEntry,
  QAMetadata,
  UsedEntry,
  UserAnswerEvaluation,
} from "@/lib/type";
import * as MSG from "../contents/messages";
import * as Utils from "../lib/utils";
import { BaseMessage } from "@langchain/core/messages";
import { embeddings, OpenAi } from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";
import { matchAnswerOpenAi } from "../lib/match";

type AiNode = {
  messages: BaseMessage[];
  usedEntry: UsedEntry[];
  step: number;
  host: string;
  whoUseDocuments: Document<Record<string, any>>[];
  whyUseDocuments: Document<Record<string, any>>[];
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
      question = MSG.THREE_ANSWER;
      break;
  }

  /* 答えの分離 と ユーザーの回答を埋め込み */
  const [userAnswer, userEmbedding] = await Promise.all([
    Utils.splitInputLlm(sepKeywordPrompt, userMessage),
    embeddings.embedQuery(userMessage),
  ]);
  console.log("質問の分離した答え: " + userAnswer);

  // 答えの模索
  const template = `あなたは、チームリーダー向けのコミュニケーション研修における回答評価の専門家です。
    
    次の質問に対して、ユーザーが答えた内容が、あらかじめ用意された正解のいずれかと**意味的に一致している**かを判断してください。  
    完全一致でなくてもかまいませんが、必ず正解のどれかと**具体的に関連している必要があります**。  
    抽象的すぎる表現や、結果のみを示す回答は、一致とは見なしません。
    
    ---  
    質問：  
    「報連相はなぜリーダーのためなのか？」
    
    想定される正解（3つ）：  
    1. 納期や期限を守るために、早めに情報を共有する必要があるため  
    2. 機能の過不足を防ぎ、仕様のズレをなくして適切な機能範囲を守るため  
    3. 品質を保証し、バグの混入や流出を防ぐため
    
    ---  
    ユーザーの回答：  
    「{Answer}」
    
    ---  
    以下の形式で答えてください：  
    - 一致した正解（1 / 2 / 3 / 一致なし）：  
    - 一致と判断した理由、もしくは一致しない理由：`;
  const prompt = PromptTemplate.fromTemplate(template);
  const correctPromises = userAnswer.map((answer) =>
    prompt.pipe(OpenAi).invoke({ Answer: answer })
  );

  // ベクトルストア準備 + 比較
  const vectorStore = await Utils.cachedVectorStore(qaDocuments);
  console.log("QA Listベクトルストア設置完了");
  const qaEmbeddingsPromises = vectorStore.similaritySearchVectorWithScore(
    userEmbedding,
    5
  );

  /* 正解チェック(OpenAi埋め込みモデル使用) */
  const data: UserAnswerEvaluation[] = [];
  const matchResults = await Promise.all(
    userAnswer.map((answer) =>
      matchAnswerOpenAi({
        userAnswer: answer,
        documents: useDocuments,
        topK: k,
        allTrue: allTrue,
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

  const correct = await Promise.all(correctPromises);
  console.log(correct.map((ans) => ans.content));

  return { userAnswerDatas, matched, qaEmbeddings, getHint };
}
