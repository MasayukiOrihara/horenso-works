/* プロンプト: 英語にして節約してみる (注) もし英語で回答しだす用なら戻す */

// 原文 `Conversation summary so far: ${summary}\n\n上記の新しいメッセージを考慮して要約を拡張してください。: `
const MEMORY_UPDATE_PROMPT = `Here is the conversation summary so far: {summary}
  
  Based on the new message above, expand this summary while retaining important intent, information, and conversational flow for long-term memory.`;

// 原文 "上記の入力を過去の会話の記憶として保持できるように重要な意図や情報・流れがわかるように短く要約してください。: "
const MEMORY_SUMMARY_PROMPT =
  "Summarize the input above concisely to preserve its key intent, information, and conversational flow, so it can be stored as memory for future context.";
