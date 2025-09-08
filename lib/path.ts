function toJSTISOString(date = new Date()) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000); // UTC+9
  return jstDate.toISOString().replace("Z", "+09:00");
}

// 現在時間（JST）
export const timestamp = toJSTISOString();

// 今日の日付
export const named = timestamp.slice(0, 10);
