import fs from "fs";

import { QAEntry } from "@/lib/type";
import { qaEntriesFilePath } from "@/lib/path";
import { readJson } from "@/lib/file/read";

/* エントリーの更新関数 */
export function updateEntry(qaEntryId: string, text: string) {
  // 既存データを読み込む（なければ空配列）
  const qaList: QAEntry[] = readJson(qaEntriesFilePath());
  // 数字を伏字にする（過去返答に引っ張られることが多いため）
  const censored = text.replace(/\d/g, "*");

  // 値の更新
  const updated = qaList.map((qa) =>
    qa.id === qaEntryId && qa.hint === ""
      ? {
          ...qa,
          hint: censored,
          metadata: {
            ...qa.metadata,
          },
        }
      : qa
  );
  // quenty 0.5以下かつ2週間前のbotデータは消滅させる
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const qaListFilter = updated.filter((item) => {
    const timestamp = new Date(item.metadata.timestamp);
    const isLowQuality = item.metadata.quality <= 0.5;
    const isOld = timestamp < twoWeeksAgo;
    const isBot = item.metadata.source === "bot";

    // 3条件すべてに当てはまるものだけ除外
    return !(isLowQuality && isOld && isBot);
  });

  // 上書き保存（整形付き）
  fs.writeFileSync(qaEntriesFilePath(), JSON.stringify(qaListFilter, null, 2));
  console.log(`✅ エントリーデータを ${qaEntriesFilePath()} に更新しました`);
}
