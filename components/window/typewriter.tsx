import { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  speed?: number; // 文字ごとの表示速度(ms)
};

export function Typewriter({ text, speed = 100 }: Props) {
  const [displayed, setDisplayed] = useState("");
  const isDev = true; // 開発時 true
  const hasRun = useRef(false);

  const refText = useRef("");
  const indexRef = useRef(0);
  useEffect(() => {
    // 開発モード時の回避処理
    if (isDev && !hasRun.current) {
      hasRun.current = true;
      return;
    }

    // 初回マウントの回避
    if (!isDev && refText.current === text) return;
    refText.current = text;

    // Unicode対応（絵文字なども対応）
    const chars = Array.from(text);
    // 再表示時にリセット
    setDisplayed("");

    let isCancelled = false;
    const typeNext = () => {
      const index = indexRef.current;
      if (isCancelled) return;

      // 出力
      setDisplayed((prev) => prev + chars[index]);
      indexRef.current = index + 1;

      if (indexRef.current < chars.length) {
        // 非同期での再帰処理
        setTimeout(typeNext, speed);
      }
    };
    typeNext(); // 開始

    // クリーンアップで止める
    return () => {
      console.log("🧹 クリーンアップ");
      isCancelled = true;
      indexRef.current = 0;
    };
  }, [text, speed]);

  return <>{displayed}</>;
}
