import * as MATCH from "@/lib/contents/match";
import { UNKNOWN_ERROR } from "@/lib/message/error";
import { MatchThreshold } from "@/lib/type";

// 変更可能スコア
let matchThreshold: MatchThreshold = {
  maxBase: MATCH.BASE_MATCH_SCORE,
  minBase: MATCH.BASE_WORST_SCORE,
  maxWrong: MATCH.WRONG_MATCH_SCORE,
  maxFuzzy: MATCH.FUZZY_MATCH_SCORE,
};

/**
 * 閾値を変更する API
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    matchThreshold = body;

    return new Response(null, {
      status: 201, // No Content
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("threshold API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * 閾値 を取得する
 * @returns
 */
export async function GET() {
  try {
    return Response.json(matchThreshold, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("threshold API GET error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
