import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

import { useUserMessages } from "../provider/MessageProvider";
import { Button } from "../ui/button";
import { requestApi } from "@/lib/api/request";
import { EVALUATION_DATA_PATH, LIST_MOVE_PATH } from "@/lib/api/path";
import { Evaluation } from "@/lib/type";
import { toast } from "sonner";
import { useErrorStore } from "@/hooks/useErrorStore";
import * as ERR from "@/lib/message/error";

/**
 * 前ターンに正解を出したユーザーの答えは正しいのか問うUI
 */
export const CorrectCheck: React.FC = () => {
  const { chatStatus } = useUserMessages();
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [evaluationData, setEvaluationData] = useState<Evaluation[]>([]);

  const { push } = useErrorStore();

  /**
   * ストリーミングが終わったタイミングで evaluationData を取得する
   */
  const oldChatStatusRef = useRef("");
  useEffect(() => {
    // プログラム開始直後
    if (oldChatStatusRef.current === "") {
      oldChatStatusRef.current = chatStatus;
      return;
    }

    const haveChanged = oldChatStatusRef.current !== chatStatus; // 前回から状態変化した
    const isStreaming = oldChatStatusRef.current === "streaming"; // 前の状態が"streaming"
    if (haveChanged && isStreaming) {
      const fetchData = async () => {
        const data = await requestApi("", EVALUATION_DATA_PATH, {
          method: "GET",
        });
        setEvaluationData(data);
        setDeletedIds([]);
      };
      fetchData();
    }
    oldChatStatusRef.current = chatStatus;
  }, [chatStatus]);

  // 削除をはいと答えた時の動作
  const handleDeleteYes = (id: string) => {
    setDeletedIds((prev) => [...prev, id]);
    evaluationData.filter((item) => item.fuzzyScore?.id !== id);
  };

  // 削除をいいえといったときの動作
  const handleDeleteNo = async (id: string) => {
    setDeletedIds((prev) => [...prev, id]);
    evaluationData.filter((item) => item.fuzzyScore?.id !== id);

    // 記述を不正解リストに移動
    try {
      await requestApi("", `${LIST_MOVE_PATH}${id}`, {
        method: "POST",
      });
    } catch (error) {
      toast.error(`${ERR.LIST_UPDATE_ERROR}\n${ERR.RELOAD_BROWSER}`);

      const message =
        error instanceof Error ? error.message : ERR.UNKNOWN_ERROR;
      const stack = error instanceof Error ? error.stack : ERR.UNKNOWN_ERROR;
      push({
        message: ERR.LIST_UPDATE_ERROR,
        detail: stack || message,
      });
    }
  };

  return (
    <div className="w-full flex-col justify-center">
      {evaluationData &&
        chatStatus === "ready" &&
        evaluationData.map((data, index) => (
          <motion.div
            key={data.fuzzyScore?.id + uuidv4()}
            className="text-sm text-zinc-500 bg-blue-200 mb-2 px-4 py-2 rounded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            {data.fuzzyScore?.id ? (
              <>
                {deletedIds.includes(data.fuzzyScore.id!) ? (
                  <span className="text-gray-400 italic">
                    ご協力ありがとうございます
                  </span>
                ) : (
                  <>
                    <div className="flex justify-center gap-14 items-center">
                      <p className="text-base text-center mb-1">
                        この回答の判定は正しいですか？
                      </p>
                      <div className="text-center text-xs mt-1">
                        <Button
                          onClick={() => handleDeleteYes(data.fuzzyScore!.id)}
                          variant={"check"}
                          className="mr-2"
                        >
                          yes
                        </Button>
                        <Button
                          onClick={async () =>
                            await handleDeleteNo(data.fuzzyScore!.id)
                          }
                          variant={"check"}
                          className=""
                        >
                          no
                        </Button>
                      </div>
                    </div>
                    <div>
                      ユーザーの回答:{" "}
                      <span className="text-zinc-700 font-bold">
                        {data.input.userAnswer}
                      </span>
                    </div>
                    <div>
                      正答:{" "}
                      <span className="text-zinc-700 font-bold">
                        {data.document.pageContent}
                      </span>
                    </div>
                    <div>
                      正解の理由:{" "}
                      <span className="text-zinc-700 font-bold">
                        {data.fuzzyScore.reason}
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div>
                <span>この回答はすでに正しい回答として判定されています。</span>
                <p className="text-zinc-700 font-bold">
                  「 {data.input.userAnswer} 」
                </p>
              </div>
            )}
          </motion.div>
        ))}
    </div>
  );
};
