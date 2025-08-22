/** tag message */
export const BULLET = "- ";
export const END_TAG = "--終了--";

/** question message */
export const FOR_REPORT_COMMUNICATION =
  "質問: 報連相は誰のためのものか唯一誰か一人を上げてください。\n\n";
export const REPORT_REASON_FOR_LEADER =
  "質問: 報連相はなぜリーダーのためのものなのか。";
export const THREE_ANSWER = "答えを3つ上げてください。\n\n";

/* prompt message */
export const INSTRUCTOR_INTRO_MESSAGE_PROMPT =
  "あなたはソフトウェア開発者向けのコミュニケーション研修における講師です。\n";
export const USER_QUESTION_LABEL_PROMPT =
  "ユーザーに以下の質問を投げかけています。\n";
export const KEYWORD_EXTRACTION_PROMPT =
  "以下の入力に含まれる単語のうち、重要なキーワードを入力から抜き出しリストアップしてください。新たな言葉は追加しないでください。\n： {input}\n\n{format_instructions}";
export const CLAIM_EXTRACTION_PROMPT = `以下の入力に含まれる文章のうち、主張や回答、理由ごとに区切って抜き出してください。
各主張は入力からのみ抜き出し、「,」で区切って出力してください。
抜き出せなかった場合は入力をそのまま出力してください。

入力: {input}

{format_instructions}`;
export const PAST_REPLY_HINT_PROMPT =
  "以下の文章は今回のユーザーの発言に近い過去の発言の、過去のAIの返答例です。今回の返答で同じような説明や解説をする場合、この返答例から言い回しや説明の仕方を参考にしてください。\n\n";
export const ANSWER_EXAMPLE_PREFIX_PROMPT =
  "今回の回答に近い過去の回答に対する過去の返答例: --- \n";
export const GUIDED_ANSWER_PROMPT = `あなたはソフトウェア開発者向けのコミュニケーション研修における回答評価の専門家です。
  以下の質問対して、ユーザーの回答から模範解答にたどり着くようなヒントを端的かつ具体的に出力してください。
  ユーザー回答が空欄の場合、問題とその模範解答からヒントを出力してください。
  出力時は模範解答や模範解答に含まれるキーワードはを伏せた文章を出力してください。
  
  問題: {question}
  模範解答: {currect_answer}
  
  ユーザーの回答: {user_answer}
  
  ヒント: `;
export const PARTIAL_CORRECT_FEEDBACK_PROMPT =
  "まず初めに以下のユーザー回答は部分的に正解になるので、正解だったことを伝え、解説をしてください。\n";
export const CLEAR_FEEDBACK_PROMPT =
  "まず初めにユーザーは答えを外したので、はっきり不正解と出力してください。\n";
export const COMMENT_ON_ANSWER_PROMPT =
  "次にユーザーの回答に一言コメントしてください。\n";
export const USER_ADVICE_PROMPT = `さらに以下のユーザーへの助言を元に、ユーザーから正解を引き出すヒントを出力してください。
  【ヒントの条件】 
  - 答えの特徴やキーワード、またそれに極めて近い同意語・役職名・機能名は**使わないでください**
  - 誘導は弱めにしてください。答えの構成要素（範囲、判断、責任など）も**ぼかして**表現してください
  - 具体的すぎず、かつ直接的すぎない、抽象度の高い内容にしてください
  - 以下の禁止ワードは使用しないでください
  禁止ワード: `;
export const CORRECT_PARTS_LABEL_PROMPT = "以下が現在正解している部分です。\n";
export const SUCCESS_MESSAGE_PROMPT =
  "問題に正解したのであなたはユーザーを褒めてください。\n";
export const STUDENT_FEEDBACK_QUESTION_PROMPT =
  "上記について話したのち、最後に生徒に下記の質問をしてください。\n";
export const SUMMARY_REQUEST_PROMPT =
  "今までの会話をまとめ、ユーザーの記憶に残るような質問の解説をしてください。\n";

export const MATCH_OF_PIECE =
  "は3つの正解のうちの1つだったことをユーザーに伝えてください\n";

export const JUDGE_ANSWER_SEMANTIC_MATCH_PROMPT = `あなたは、ソフトウェア開発者向けのコミュニケーション研修における回答評価の専門家です。
    
    次の質問に対して、ユーザーが答えた内容が、あらかじめ用意された正解のいずれかと**意味的に一致している**かを判断してください。  
    完全一致でなくても、意味が近ければ一致とみなしてかまいませんが、抽象的すぎる表現は一致とは見なしません。
    
    ---  
    質問：  
    {question}
    
    想定される正解：  
    {current_answer} 
    
    ---  
    ユーザーの回答：  
    「{user_answer}」
    
    ---  
   以下のJSON形式で答えてください：  
      "id": [空欄],
      "answer": [ユーザーの回答],
      "reason": [一致と判断した理由、もしくは一致しない理由],
      "metadata":
        "parentId": [一致した正解（1 / 2 /...)、一致とみなさなかった場合は(null)],
        "question_id": [空欄],
        "timestamp": [空欄],
        "source": "bot"`;

// ユーザーの入力意図を抽出するプロンプト
export const USER_INTENT_PROMPT = `以下の入力対して、ユーザーの入力意図を推測し出力してください。
入力意図の出力は以下の分類から選択してください。
    
入力意図の分類: 回答 | 質問 | 冗談 | その他
※ その他を選択した場合は理由と新たに分けるとしたら分類を出力してください。
    
    
ユーザーの入力: {input}
assistant: `;
