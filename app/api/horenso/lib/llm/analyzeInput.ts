import { PromptTemplate } from "@langchain/core/prompts";

import { strParser } from "@/lib/llm/models";
import { LLMParserResult, runWithFallback } from "@/lib/llm/run";

import * as MSG from "@/lib/contents/horenso/template";
import { requestApi } from "@/lib/api/request";
import { SessionFlags } from "@/lib/type";
import { LOAD_MULTIPLE_PATH } from "@/lib/api/path";
import { INPUT_ANALYZE_HISTORY_WARNING } from "@/lib/message/warning";
import { INPUT_ANALYZE_ERROR } from "@/lib/message/error";

/** 会話からユーザーの意図を推測する */
export const analyzeInput = async (
  input: string,
  question: string,
  sessionFlags: SessionFlags
) => {
  const template: string[] = [];

  template.push(MSG.INSTRUCTOR_INTRO_MESSAGE_PROMPT);
  template.push(MSG.ASSISTANT_TASK_CLASSIFICATION_PROMPT);
  template.push(MSG.ASSISTANT_TASK_CLASSIFICATION_PROMPT);
  template.push(MSG.USER_INTENT_PROMPT);

  // 過去履歴を参照させて文脈で判断させる
  let str: string = "";
  try {
    let history: string = "";
    const res = await requestApi(
      sessionFlags.baseUrl!,
      `${LOAD_MULTIPLE_PATH}?sessionId=${encodeURIComponent(
        sessionFlags.sessionId
      )}`,
      {
        method: "POST",
        body: {},
      }
    );

    // 会話履歴の取得チェック
    if (res) {
      history = res;
    } else {
      console.warn(INPUT_ANALYZE_HISTORY_WARNING);
    }

    // プロンプトの準備
    const prompt = PromptTemplate.fromTemplate(template.join("\n"));
    const promptVariables = {
      question: question,
      chat_history: history,
      input: input,
    };
    // LLM応答
    const response = (await runWithFallback(prompt, promptVariables, {
      mode: "invoke",
      parser: strParser,
      label: "analyze input",
      sessionId: sessionFlags.sessionId,
    })) as LLMParserResult;

    str = response as string;
  } catch (error) {
    console.warn(INPUT_ANALYZE_ERROR + error);
  }

  return str;
};
