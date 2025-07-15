import { getBaseUrl, notCrrectFilePath, semanticFilePath } from "@/lib/path";
import { SemanticAnswerData } from "@/lib/type";
import { readJson } from "@/app/api/chat/utils";
import { updateSemanticMatch } from "@/app/api/horenso/lib/match/semantic";

/**
 * semantic match answer からデータを移動するAPI
 * @param req
 * @returns
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const semanticId = params.id;

  try {
    const { host } = getBaseUrl(req);
    const semanticListUrl = semanticFilePath(host);
    const notCorrectUrl = notCrrectFilePath(host);

    // データ取得
    const semanticList: SemanticAnswerData = readJson(semanticListUrl);
    const notCorrectList: SemanticAnswerData = readJson(notCorrectUrl);

    // フィルターして上書き
    let matched = semanticList.who
      .flat()
      .find((item) => item.id === semanticId);
    if (!matched)
      matched = semanticList.why.flat().find((item) => item.id === semanticId);

    if (matched) {
      updateSemanticMatch(
        matched,
        notCorrectList,
        notCorrectUrl,
        matched.metadata.question_id
      );
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.log("API ERROR" + error);
    return new Response(JSON.stringify({ error: error }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
