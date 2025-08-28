import { Document } from "langchain/document";
import { PromptTemplate } from "@langchain/core/prompts";
import { v4 as uuidv4 } from "uuid";
import { StructuredOutputParser } from "langchain/output_parsers";

import { HorensoMetadata, PhrasesMetadata } from "@/lib/type";
import { runWithFallback } from "@/lib/llm/run";
import { timestamp } from "@/lib/path";
import { documentsSchema } from "@/lib/schema";
import { JSON_PARSE_ERROR } from "@/lib/message/error";
import { JUDGE_ANSWER_FUZZY_MATCH_PROMPT } from "@/lib/contents/horenso/template";

/**
 * ユーザー回答が答えに意味的に近いか LLM に判断させて document型 で出力する
 * @param userAnswer
 * @param documents
 * @returns
 */
export const evaluateUserAnswer = async (
  userAnswer: string,
  documents: Document<HorensoMetadata>[]
) => {
  // 問題の取得
  const question = documents[0].metadata.question;
  const question_id = documents[0].metadata.question_id;
  // 問題の回答（正解が複数の場合、すべての正解（多）×ユーザーの回答（単）で比較）
  const currentAnswer = documents
    .map((doc, i) => `${i + 1}. ${doc.pageContent}`)
    .join("\n");

  // StructuredOutputParser を作成
  const parser = StructuredOutputParser.fromZodSchema(documentsSchema);
  const prompt = PromptTemplate.fromTemplate(JUDGE_ANSWER_FUZZY_MATCH_PROMPT);
  const promptVariables = {
    question: question,
    current_answer: currentAnswer,
    user_answer: userAnswer,
    format_instructions: parser.getFormatInstructions(),
  };

  const phreases: Document<PhrasesMetadata>[] = [];
  try {
    // LLM応答
    const response = await runWithFallback(prompt, promptVariables, {
      mode: "invoke",
      parser: parser,
      label: "evaluate user answer",
    });
    const docs = await parser.parse(response.content);

    // 型変換
    for (const doc of docs) {
      const data: Document<PhrasesMetadata> = {
        pageContent: userAnswer,
        metadata: {
          id: uuidv4(),
          question_id: question_id,
          parentId: doc.metadata.parentId,
          timestamp: timestamp,
          rationale: doc.metadata.rationale,
          source: "bot",
        },
      };
      phreases.push(data);
    }
  } catch (error) {
    // ダメだったら空のデータを返す
    console.error(JSON_PARSE_ERROR, error);
    const data: Document<PhrasesMetadata> = {
      pageContent: userAnswer,
      metadata: {
        id: uuidv4(),
        question_id: question_id,
        parentId: "",
        timestamp: timestamp,
        rationale: JSON_PARSE_ERROR,
        source: "bot",
      },
    };
    phreases.push(data);
  }
  console.log("🛎 AI 判断結果:");
  console.log(phreases.map((date) => date.metadata.rationale));

  return phreases;
};
