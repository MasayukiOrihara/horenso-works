import { UserAnswerEvaluation } from "@/lib/type";

let userAnswerDatas: UserAnswerEvaluation[] = [];

/**
 * userAnswerData をフロントとやり取りするための API
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    userAnswerDatas = body.sendUserAnswerData;

    return new Response(null, {
      status: 201, // No Content
    });
  } catch (error) {
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

/**
 * userAnswerDatas を取得する
 * @returns
 */
export async function GET() {
  try {
    return Response.json(userAnswerDatas, {
      status: 200,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
