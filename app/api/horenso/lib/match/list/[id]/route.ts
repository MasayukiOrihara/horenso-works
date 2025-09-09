import { supabaseClient } from "@/lib/supabase/clients";
import * as ERR from "@/lib/message/error";

/**
 * fuzzylist とwronglistを更新する
 * @returns
 */
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // メタデータ Id

    const { data, error } = await supabaseClient().rpc(
      "move_fuzzy_to_wrong_by_metadata_id",
      { _metadata_id: id }
    );

    if (error) {
      console.error(ERR.SUPABASE_UPSERT_ERROR, error);
      return Response.json(
        { ok: false, message: ERR.DATA_LOAD_ERROR },
        { status: 500 }
      );
    }

    console.log(`✅ ${data} 件 list を更新しました ID: ${id}`);

    return new Response(null, {
      status: 201, // No Content
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;

    console.error("list move API GET error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
