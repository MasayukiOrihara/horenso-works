import { supabaseClient } from "@/lib/supabase/clients";
import * as ERR from "@/lib/message/error";

/**
 * リスト をすべて取得する
 * @returns
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const listName: string = body.listName;
    if (!listName) {
      console.error(ERR.LISTNAME_ERROR);
      return Response.json({ error: ERR.LISTNAME_ERROR }, { status: 400 });
    }

    // DB から list を取得
    const { data, error } = await supabaseClient()
      .from(listName)
      .select("id, content, metadata")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(ERR.SUPABASE_UPSERT_ERROR, error);
      return Response.json(
        { ok: false, message: ERR.DATA_LOAD_ERROR },
        { status: 500 }
      );
    }

    return Response.json(data ?? null, {
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("list all load API GET error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
