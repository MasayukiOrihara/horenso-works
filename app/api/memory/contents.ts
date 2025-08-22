/* プロンプト: 英語にして節約してみる (注) もし英語で回答しだす用なら戻す */

// 原文 `Conversation summary so far: ${summary}\n\n上記の新しいメッセージを考慮して要約を拡張してください。: `
export const MEMORY_UPDATE_PROMPT = `{input}

 --- 
Here is the conversation summary so far: {summary}

 --- 
Based on the new message above, expand this summary while retaining important intent, information, and conversational flow for long-term memory.`;

// 単純な要約
export const SUMMARY_PROMPT_JP = `{input}

次の応答を約40語で英語で要約してください。 
アイデア、意図、および情報の流れに焦点を当ててください。 
「ユーザー」または「アシスタント」という言葉は使用しないでください。`;

export const SUMMARY_PROMPT = `{input}

 ---
Summarize the above response in about 40 words in English. 
Focus on the ideas, intentions, and flow of information. 
Do not use the words "user" or "assistant".`;
