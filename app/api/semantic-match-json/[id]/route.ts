import { semanticFilePath } from "@/lib/path";
import fs from "fs/promises";
import { SemanticAnswerData, SemanticAnswerEntry } from "@/lib/type";
import { readJson } from "@/lib/file/read";

/**
 * semantic match answer からデータを削除するAPI
 * @param req
 * @returns
 */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const semanticId = params.id;

  try {
    const filePath = semanticFilePath();

    // データ取得
    const list: SemanticAnswerData = readJson(semanticFilePath());

    // フィルターして上書き
    const newWho: SemanticAnswerEntry[][] = list.who.map((innerArray) =>
      innerArray.filter((item) => item.id !== semanticId)
    );
    const newWhy: SemanticAnswerEntry[][] = list.why.map((innerArray) =>
      innerArray.filter((item) => item.id !== semanticId)
    );
    const newData: SemanticAnswerData = { who: newWho, why: newWhy };
    await fs.writeFile(filePath, JSON.stringify(newData, null, 2), "utf-8");

    return new Response(null, { status: 204 }); // No Content
  } catch (error) {
    console.log("API ERROR" + error);
    return new Response(JSON.stringify({ error: "削除失敗" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
