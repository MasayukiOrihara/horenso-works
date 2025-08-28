import { UNKNOWN_ERROR } from "@/lib/message/error";
import { Evaluation } from "@/lib/type";

let evaluationData: Evaluation[] = [];

/**
 * evaluationData をフロントとやり取りするための API
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    evaluationData = body.sendEvaluationData;

    return new Response(null, {
      status: 201, // No Content
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("evaluation data API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * evaluationData を取得する
 * @returns
 */
export async function GET() {
  try {
    return Response.json(evaluationData, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("evaluation data API GET error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
