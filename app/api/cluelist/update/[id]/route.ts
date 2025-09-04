import { METADATA_CLUE_KEY } from "@/lib/contents/match";
import { UNKNOWN_ERROR } from "@/lib/message/error";
import { MetadataRepo } from "@/lib/supabase/repositories/metadata.repo";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // セッション ID
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  const body = await req.json();
  const clue = body.clue;
  if (typeof clue !== "string") {
    return Response.json({ error: "clue must be a string" }, { status: 400 });
  }

  // DB 接続
  try {
    const r = await MetadataRepo.updateByMetaId(id, METADATA_CLUE_KEY, clue);
    if (!r.ok) {
      // エラー時: API 内では呼び出し元に任せる
      throw r.error;
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("memory load latest API PATCH error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
