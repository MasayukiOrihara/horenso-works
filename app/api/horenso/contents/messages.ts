/** tag message */
export const BULLET = "- ";
export const END_TAG = "--終了--";

/** question message */
export const FOR_REPORT_COMMUNICATION =
  "質問: ソフトウェア開発の仕事を想定した場合、報連相は誰のためのものか唯一誰か一人を上げてください。\n\n";
export const REPORT_REASON_FOR_LEADER =
  "質問: 報連相はなぜリーダーのためのものなのか。";
export const THREE_ANSWER = "答えを3つ上げてください。\n\n";

/* prompt message */
export const INSTRUCTOR_INTRO_MESSAGE_PROMPT =
  "あなたは講師として報連相ワークを行っています。\n";
export const USER_QUESTION_LABEL_PROMPT =
  "ユーザーに以下の質問を投げかけています。\n";
export const KEYWORD_EXTRACTION_PROMPT =
  "以下の入力に含まれる単語のうち、重要なキーワードを入力から抜き出しリストアップしてください。新たな言葉は追加しないでください。\n： {input}\n\n{format_instructions}";
export const CLAIM_EXTRACTION_PROMPT =
  "以下の入力に含まれる文章のうち、主張ごとに区切って抜き出してください。\n各主張は入力からのみ抜き出し、「,」で区切って出力してください。\n抜き出せなかった場合は入力をそのまま出力してください。\n\n入力: {input}\n\n{format_instructions}";
export const PAST_REPLY_HINT_PROMPT =
  "以下の過去の返答例を参考にしてください。\n\n";
export const ANSWER_EXAMPLE_PREFIX_PROMPT = "この回答に対する過去の返答例: \n";
export const GUIDED_ANSWER_PROMPT =
  "以下の質問に対して、ユーザー自身が模範解答にたどり着くようなヒントを出力してください。出力時は模範解答を伏せた文章を出力してください。\n\n{question}\n模範解答: {currect_answer}\n\nユーザーの回答: {user_answer}\nヒント: ";
export const PARTIAL_CORRECT_FEEDBACK_PROMPT =
  "まず初めに以下は部分正解になるので、正解だったことを伝え、解説をしてください。\n";
export const CLEAR_FEEDBACK_PROMPT =
  "まず初めにユーザーは答えを外したので、はっきり不正解と出力してください。\n";
export const COMMENT_ON_ANSWER_PROMPT =
  "次にユーザーの回答に一言コメントしてください。\n";
export const USER_ADVICE_PROMPT =
  "さらに以下のユーザーへの助言を参考に、ユーザーから回答を引き出してください。また質問の答えとなりそうな誰かやキーワードは出力しないでください。\n\nユーザーへの助言: \n";
export const CORRECT_PARTS_LABEL_PROMPT = "以下が現在正解している部分です。\n";
export const SUCCESS_MESSAGE_PROMPT =
  "問題に正解したのであなたはユーザーを褒めてください。\n";
export const STUDENT_FEEDBACK_QUESTION_PROMPT =
  "上記について話したのち、最後に生徒に下記の質問をしてください。\n";
export const SUMMARY_REQUEST_PROMPT =
  "今までの会話をまとめ、ユーザーの記憶に残るような質問の解説をしてください。\n";

export const MATCH_OF_PIECE =
  "は3つの正解のうちの1つだったことをユーザーに伝えてください\n";
