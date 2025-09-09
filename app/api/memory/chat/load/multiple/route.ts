import { supabaseClient } from "@/lib/supabase/clients";
import { MEMORY_TABLE } from "@/lib/contents/match";
import { UNKNOWN_ERROR } from "@/lib/message/error";
import { NextRequest } from "next/server";
import { MemoryTextData } from "@/lib/type";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId)
    return Response.json({ error: "sessionId is required" }, { status: 400 });

  // DB 接続
  try {
    const { data, error } = await supabaseClient()
      .from(MEMORY_TABLE)
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(4);

    if (error) throw error;

    // 整形
    const toLine = (msg: MemoryTextData) =>
      `${msg.role}: ${msg.content.replace(/\r?\n/g, "")}`;
    const lines = data.map(toLine).join("\n");

    return Response.json(lines ?? null, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : UNKNOWN_ERROR;

    console.error("memory load multiple API POST error: " + message);
    return Response.json({ error: message }, { status: 500 });
  }
}
