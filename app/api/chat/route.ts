import { LangSmithClient } from "@/lib/clients";
import { OpenAi } from "@/lib/models";
import { PromptTemplate } from "@langchain/core/prompts";
import { Message as VercelChatMessage, LangChainAdapter } from "ai";

/**
 * 報連相ワークAI
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages = body.messages ?? [];

    // 過去の履歴
    const formatMessage = (message: VercelChatMessage) => {
      return `${message.role}: ${message.content}`;
    };
    const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
    // 直近のメッセージを取得
    const userMessage = messages[messages.length - 1].content;
    // langgraph
    // // const result = await graph.invoke({
    // //   messages: [new HumanMessage(userMessage)],
    // // });

    // console.log("langgraph: " + result.messages[1].content);

    // プロンプト読み込み
    const template = await LangSmithClient.pullPromptCommit("horenso_ai-kato");
    const prompt = PromptTemplate.fromTemplate(
      template.manifest.kwargs.template
    );

    // ストリーミング応答を取得
    const stream = await prompt.pipe(OpenAi).stream({
      chat_history: formattedPreviousMessages,
      user_message: userMessage,
      ai_message: "",
    });

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
