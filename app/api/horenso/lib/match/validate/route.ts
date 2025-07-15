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
 * shouldValidate を取得する
 * @returns
 */
export async function GET() {
  try {
    return Response.json(shouldValidate, {
      status: 200,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}
