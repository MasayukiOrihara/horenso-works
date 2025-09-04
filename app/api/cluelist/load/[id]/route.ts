import { supabaseClient } from "@/lib/supabase/clients";
import { CLUE_TABLE } from "@/lib/contents/match";
import { UNKNOWN_ERROR } from "@/lib/message/error";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // セッション ID
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  // DB 接続
  try {
    const { data, error } = await supabaseClient()
      .from(CLUE_TABLE)
      .select("*")
      .eq("metadata->>id", id)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return Response.json(data ?? [], { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("memory load latest API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
