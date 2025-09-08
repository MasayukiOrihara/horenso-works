import { Dialog } from "../window/dialog";
import { useUserMessages } from "../provider/MessageProvider";
import { useEffect, useRef, useState } from "react";
import { useSessionFlags } from "../provider/SessionFlagsProvider";
import { requestApi } from "@/lib/api/request";
import { LOAD_LATEST_PATH } from "@/lib/api/path";
import { toast } from "sonner";
import { useErrorStore } from "@/hooks/useErrorStore";
import * as ERR from "@/lib/message/error";

export const MessageWindow = () => {
  const [lines, setLines] = useState<string[]>([]);
  const { aiMessage, chatStatus } = useUserMessages();
  const { value: sessionFlags, setValue: setSessionFlags } = useSessionFlags();
  const { push } = useErrorStore();

  /* メッセージ関係 */
  useEffect(() => {
    // aiメッセージの取得
    if (aiMessage || aiMessage.trim() !== "") {
      onStreamData(aiMessage);
      return; // 終了
    }
  }, [aiMessage]);

  const fetchedFor = useRef<string | null>(null);
  const syncRef = useRef(sessionFlags.sync);
  const syncPhase = useRef(sessionFlags.phase);
  const sessionIdRef = useRef(sessionFlags.sessionId);
  useEffect(() => {
    const isActiveChat =
      chatStatus === "submitted" || chatStatus === "streaming";
    const isBefore =
      sessionFlags.sync === "idle" || sessionFlags.phase === "locked";

    if (fetchedFor.current === sessionIdRef.current) return; // 同セッションで一度だけ
    fetchedFor.current = sessionIdRef.current;

    console.log("初");
    console.log(lines);

    if (lines.length) return; // 文字列の表示がある
    console.log("空");
    if (isActiveChat) return; // chatの取得中
    console.log("前");
    if (isBefore) return; // 動作の開始前だった
    console.log("絶");

    // 再起動後などでaiMessageが存在しない時
    (async () => {
      try {
        // 最新の過去会話履歴を取得
        const res: string = await requestApi(
          "",
          `${LOAD_LATEST_PATH}?sessionId=${encodeURIComponent(
            sessionIdRef.current
          )}`
        );
        // メッセージとして使用
        const oldLines = res
          .split(/\r\n|\n|\r/)
          .map((s) => s.trim())
          .filter(Boolean);

        // ダイアログに流す
        setLines(oldLines);
      } catch (error) {
        toast.error(`${ERR.FATAL_ERROR}\n${ERR.RELOAD_BROWSER}`);

        const message =
          error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
        const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
        push({
          message: ERR.USERPROFILE_SEND_ERROR,
          detail: stack || message,
        });
      }
    })();

    console.log("後");
  }, [sessionFlags.sync]);

  // 文章を改行で分離するための関数(最後の分は別で検知)
  const previousRef = useRef<string>("");
  function onStreamData(chunk: string) {
    let parts: string[] = [];
    // 用済みの文章を切断
    const sliceChunk = chunk.slice(previousRef.current.length);

    // 新たに改行があったら保存 + 空白は除去
    if (sliceChunk.includes("\n")) {
      parts = chunk.split("\n").filter(Boolean);
      previousRef.current = chunk;
    }

    if (parts.length > 0) {
      setLines((prev) => [...prev, parts[parts.length - 1]]);
    }
  }

  useEffect(() => {
    // 最後の一行の取得
    if (aiMessage && chatStatus === "ready") {
      const sliceChunk = aiMessage.slice(previousRef.current.length);
      setLines((prev) => [...prev, sliceChunk]);
    }
    // 初期化
    if ((aiMessage || lines.length) && chatStatus === "submitted") {
      setLines([]);
      previousRef.current = "";
    }
  }, [chatStatus, aiMessage]);

  return (
    <div>
      <Dialog lines={lines} />
    </div>
  );
};
