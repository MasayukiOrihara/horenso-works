import { supabaseClient } from "@/lib/supabase/clients";
import * as ERR from "@/lib/message/error";
import { userprofileFormValues } from "@/lib/schema";
import { DEFAULT_PROFIRE } from "@/lib/contents/defaultValue/userProfile";

/**
 * userprofile を取得する
 * @returns
 */
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // セッション ID

    // DB からユーザーデータを取得
    const { data, error } = await supabaseClient()
      .from("user_profiles")
      .select("*")
      .eq("session_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(ERR.SUPABASE_UPSERT_ERROR, error);
      return Response.json(
        { ok: false, message: ERR.DATA_LOAD_ERROR },
        { status: 500 }
      );
    }

    // データを整形
    const userprofile: userprofileFormValues = data
      ? {
          ...DEFAULT_PROFIRE,
          name: data.name?.trim() || "",
          gender: data.gender || "none",
          country: data.country || "other",
          company: data.company?.trim() || "",
          organization: data.organization || "other",
        }
      : DEFAULT_PROFIRE;

    return Response.json(userprofile, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("userprofile API GET error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
