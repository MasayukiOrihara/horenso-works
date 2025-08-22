import { UNKNOWN_ERROR } from "@/lib/message/error";
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
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("USER ANSWER DATA API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
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
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("USER ANSWER DATA API GET error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
