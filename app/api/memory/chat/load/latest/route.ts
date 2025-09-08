import { supabaseClient } from "@/lib/supabase/clients";
import { MEMORY_TABLE } from "@/lib/contents/match";
import { UNKNOWN_ERROR } from "@/lib/message/error";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId)
    return Response.json({ error: "sessionId is required" }, { status: 400 });

  // DB 接続
  try {
    const { data, error } = await supabaseClient()
      .from(MEMORY_TABLE)
      .select("content")
      .eq("session_id", sessionId)
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return Response.json(data?.content ?? null, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("memory load latest API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
