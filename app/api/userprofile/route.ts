import { UNKNOWN_ERROR } from "@/lib/message/error";
import { userprofileFormValues } from "@/lib/schema";

let userprofile: userprofileFormValues[] = [];

/**
 * userprofile をフロントとやり取りするための API
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    userprofile = body.userprofile;
    console.log(userprofile);

    // DB に保存

    return new Response(null, {
      status: 201, // No Content
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("userprofile API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * userprofile を取得する
 * @returns
 */
export async function GET() {
  try {
    return Response.json(userprofile, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("userprofile API GET error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
