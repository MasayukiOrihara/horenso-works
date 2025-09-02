import { supabaseClient } from "@/lib/clients";
import * as ERR from "@/lib/message/error";
import { userprofileFormValues } from "@/lib/schema";

type RequestBody = {
  userprofile: userprofileFormValues;
  sessionId: string;
};

/**
 * userprofile をフロントとやり取りするための API
 * @param req
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json();
    if (!body.userprofile || !body.sessionId) {
      return Response.json({ error: ERR.RECUESTBODY_ERROR }, { status: 400 });
    }
    const userprofile = body.userprofile;
    const sessionId = body.sessionId;

    // 送信用に正規化（空文字はnullへ）
    const payload = {
      session_id: sessionId,
      name: userprofile.name?.trim() ? userprofile.name.trim() : null,
      gender: userprofile.gender === "none" ? null : userprofile.gender,
      country: userprofile.country === "other" ? null : userprofile.country,
      company: userprofile.company?.trim() ? userprofile.company.trim() : null,
      organization:
        userprofile.organization === "other" ? null : userprofile.organization,
    };

    // DB に保存
    const { error } = await supabaseClient()
      .from("user_profiles")
      .upsert(payload, { onConflict: "session_id" });

    if (error) {
      console.error(ERR.SUPABASE_UPSERT_ERROR, error);
      return Response.json(
        { ok: false, message: ERR.DATA_SAVE_ERROR },
        { status: 500 }
      );
    }

    return new Response(null, {
      status: 201, // No Content
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("userprofile API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
