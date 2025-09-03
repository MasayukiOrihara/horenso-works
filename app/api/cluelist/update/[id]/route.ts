import { updateMetadataSupabase } from "@/app/api/horenso/lib/match/lib/supabase";
import { UNKNOWN_ERROR } from "@/lib/message/error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // セッション ID
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  const body = await req.json();
  const clue = body.clue;

  // DB 接続
  try {
    await updateMetadataSupabase(id, "clue", clue);

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("memory load latest API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
