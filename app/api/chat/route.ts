import { LangSmithClient } from "@/lib/clients";
import { FakeListChatModel } from "@langchain/core/utils/testing";
import * as MESSAGES from "@/lib/messages";
import { haiku3_5, OpenAi, strParser } from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";
import { Message as VercelChatMessage, LangChainAdapter } from "ai";
import fs from "fs";
import path from "path";
import { put, head } from "@vercel/blob";

// 外部フラグ
let horensoContenue = false;
let oldHorensoContenue = false;

// テキスト保存先
const timestamp = new Date().toISOString();
const named = timestamp.slice(0, 10);
const memoryFileName = `memory-${named}.txt`;
const learnFileName = `learn-${named}.txt`;
const memoryFilePath = path.join(process.cwd(), "memory", memoryFileName);
const learnFilePath = path.join(process.cwd(), "learn", learnFileName);

// 一時的な追加プロンプト
let tempPrompt = "";

/**
 * 報連相ワークAI
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];

    const host = req.headers.get("host");
    const protocol = host?.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // 過去の履歴
    const formatMessage = (message: VercelChatMessage) => {
      return `${message.role}: ${message.content}`;
    };
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    // 直近のメッセージを取得
    const userMessage = messages[messages.length - 1].content;

    /** これまでの会話を記憶(前回ターンで返ってきたai返答と今回ターンのuser解答を追記) */
    const onMemory = req.headers.get("memoryOn") === "true";
    console.log("chat側記憶設定: " + onMemory);
    if (onMemory) {
      console.log("会話を記憶中...");

      // テキストの整形
      const formatted = messages.slice(-2).map(formatMessage);
      const cleaned = formatted.map((str: string) =>
        str.replace(/[\r\n]+/g, "")
      );
      const result =
        cleaned.join("\n") + "\n - " + timestamp.slice(0, 16) + "\n";

      console.log("書き出す内容: " + result);

      // ファイル書き出し(ローカル)
      if (host?.includes("localhost")) {
        fs.appendFileSync(memoryFilePath, result, "utf-8");
        console.log(`✅ 会話内容を ${memoryFileName} に保存しました。`);
      } else if (host?.includes("vercel")) {
        // vercel版
        let existingContent = "";
        try {
          // 既存ファイルの存在確認
          const blobInfo = await head(memoryFileName);
          if (blobInfo) {
            // 既存ファイルを読み込み
            const response = await fetch(blobInfo.url);
            existingContent = await response.text();
            console.log("元々の内容: " + existingContent);
          }
        } catch (error) {
          // ファイルが存在しない場合は空文字列のまま
          console.log("File does not exist, creating new file: " + error);
        }
        // 既存内容 + 新しい内容
        const updatedContent = existingContent + result;
        const blob = await put(memoryFileName, updatedContent, {
          access: "public",
          contentType: "text/plain",
          allowOverwrite: true, // 上書きを許可
        });
        console.log(`✅ 会話内容を ${blob.url} に保存しました。`);
      } else {
        console.log("⚠ 記憶の保存ができませんでした。");
      }
    }

    /** 講師の指摘から学ぶ */
    const onLearn = req.headers.get("learnOn") === "true";
    console.log("chat側学習設定: " + onLearn);
    if (onLearn) {
      console.log("会話を指摘可能...");

      const learnTemplate = MESSAGES.LEARN_CHECK;
      const learnPrompt = PromptTemplate.fromTemplate(learnTemplate);
      const isInstructionalResponse = await learnPrompt
        .pipe(haiku3_5)
        .pipe(strParser)
        .invoke({
          user_input: userMessage,
        });
      console.log("指摘かどうか: " + isInstructionalResponse);

      if (isInstructionalResponse.includes("YES")) {
        // プロンプトに追加
        tempPrompt += userMessage + "\n";
        const result = " - " + userMessage + "\n";

        // 指摘をファイルに書き出し
        if (host?.includes("localhost")) {
          fs.appendFileSync(learnFilePath, result, "utf-8");
          console.log(`✅ 指摘内容を ${learnFileName} に保存しました。`);
        } else if (host?.includes("vercel")) {
          // vercel版
          let existingContent = "";
          try {
            // 既存ファイルの存在確認
            const blobInfo = await head(learnFileName);
            if (blobInfo) {
              // 既存ファイルを読み込み
              const response = await fetch(blobInfo.url);
              existingContent = await response.text();
            }
          } catch (error) {
            // ファイルが存在しない場合は空文字列のまま
            console.log("File does not exist, creating new file: " + error);
          }
          // 既存内容 + 新しい内容
          const updatedContent = existingContent + result;
          const blob = await put(learnFileName, updatedContent, {
            access: "public",
            contentType: "text/plain",
            allowOverwrite: true, // 上書きを許可
          });
          console.log(`✅ 会話内容を ${blob.url} に保存しました。`);
        } else {
          console.log("⚠ 記憶の保存ができませんでした。");
        }

        // 会話を抜ける
        const fakeModel = new FakeListChatModel({
          responses: [MESSAGES.POINT_OUT_LOG],
        });
        const fakePrompt = PromptTemplate.fromTemplate("");
        const fakeStream = await fakePrompt.pipe(fakeModel).stream({});
        return LangChainAdapter.toDataStreamResponse(fakeStream);
      }
    }

    // 始動時の状態判定
    let aiMessage = "";
    horensoContenue = true;
    if (horensoContenue && !oldHorensoContenue) {
      oldHorensoContenue = true;

      aiMessage =
        MESSAGES.DEVELOPMENT_WORK_EXPLANATION + MESSAGES.QUESTION_WHO_ASKING;
      console.log("始めの会話");
    } else {
      // 報連相ワークAPI呼び出し
      const res = await fetch(baseUrl + "/api/horenso", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ messages }),
      });
      const apiBody = await res.json();
      aiMessage = apiBody.text;

      // 終了時の状態判定
      console.log("継続判定 api側: " + apiBody.contenue);
      console.log("継続判定 chat側: " + horensoContenue);
      if (apiBody.contenue != horensoContenue) {
        horensoContenue = false;
        aiMessage = aiMessage + "\n\n" + MESSAGES.FINISH_MESSAGE;
      }
    }

    // プロンプト読み込み
    const load = await LangSmithClient.pullPromptCommit("horenso_ai-kato");
    const template = tempPrompt + load.manifest.kwargs.template;
    const prompt = PromptTemplate.fromTemplate(template);

    // ストリーミング応答を取得
    const stream = await prompt.pipe(OpenAi).stream({
      chat_history: formattedPreviousMessages,
      user_message: userMessage,
      ai_message: aiMessage,
    });

    console.log("chat ai_message: " + aiMessage);

    return LangChainAdapter.toDataStreamResponse(stream);
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
