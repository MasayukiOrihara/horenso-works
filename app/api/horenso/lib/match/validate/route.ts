import { UNKNOWN_ERROR } from "@/lib/message/error";
import { ShouldValidate } from "@/lib/type";

let shouldValidate: ShouldValidate = { who: false, why: true };

/**
 * ユーザの回答が適正だったかをチェックする API
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    shouldValidate = body;

    return new Response(null, {
      status: 201, // No Content
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("validate API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * shouldValidate を取得する
 * @returns
 */
export async function GET() {
  try {
    return Response.json(shouldValidate, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("validate API GET error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
