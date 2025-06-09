/* prompt message */
// horenso.ts
export const DEVELOPMENT_WORK_EXPLANATION =
  "開発の仕事について語ってください。ただし、報連相が誰のためかという話題には触れないでください。\n";
export const QUESTION_WHO_ASKING =
  "上記について話したのち、生徒に下記の質問をしてください。\n---\nソフトウェア開発の仕事を想定した場合、報連相は誰のためのものか唯一誰か一人を上げてください。";
export const HINTO_GIVING =
  "答えを外したのであなたはユーザーを諫め、[ヒント]をあげてください。\n";
export const SUCCESS_MESSAGE =
  "問題に正解したのであなたはユーザーを褒めてください。\n";
export const QUESTION_WHY_ASKING =
  "上記を実施したのち、「報連相はリーダーのため」ということを前提に下記の質問をしてください。\n---\n報連相はなぜリーダーのためのものなのか。答えを3つ上げてください。";
export const SUCCESS_MESSAE_LITTLE =
  "あなたはユーザーに「${userAnswer}」が正解だったことを報告してください。\n";
export const HORENSO_EXPLANATION =
  "今までの会話の流れを受けてなぜ報連相が必要なのか解説してください。また解説の後ユーザーにこの講習を終えての所感を聞いてください。\n";
export const FINISH_MESSAGE = "報連相の講習が終了したことを伝えてください。\n";
export const QUESTION_WHO_CHECK =
  "文章: {input}\nこの文章から人物または役職名を1つ抜き出してください。以下を人物として扱います：\n- 固有名詞（田中、山田など）\n- 一人称（自分、私、僕など）  \n- 役職名（部長、リーダー、課長、社長など）\n入力が単語の場合はそのまま出力し、複数ある場合は主要なものを1つ選んでください。該当するものがない場合は「NO」と出力してください。出力は抽出した語のみです。";
export const QUESTION_WHY_CHECK =
  "文章: {input}\n\nこの文章を主張ごとに区切って抜き出してください。\n各主張は簡潔にまとめて、「,」で区切って出力してください。\n抜き出せなかった場合は「NO」とだけ出力してください。\n\n{format_instructions}";
export const MATCH_OF_PIECE =
  "は3つの正解のうちの1つだったことをユーザーに伝えてください\n";

// chat.ts
export const LEARN_CHECK =
  "あなたはアシスタントの出力に対するユーザーの反応を分類するシステムです。\n次のユーザー発言が「AIの説明や表現に対する指摘・フィードバック（例：間違いの指摘、不自然な言い回しの指摘、改善提案など）」に該当する場合は YES、そうでなければ NO を返してください。\n\nユーザー発言：\n{user_input}\n\n出力は YES または NO のいずれかにしてください。理由や他の情報は出力しないでください。";
export const POINT_OUT_LOG = "指摘を受け付けました。";
