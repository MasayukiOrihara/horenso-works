import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

import { useUserMessages } from "../messages/message-provider";
import { Button } from "../ui/button";
import {
  semanticMatchJsonDeleteAPI,
  semanticMatchJsonMoveAPI,
} from "@/lib/api/api";
import { Evaluation } from "@/app/api/horenso/lib/match/route";
import { requestApi } from "@/lib/api/request";

const a = "/api/user-answer-data";

/**
 * 前ターンに正解を出したユーザーの答えは正しいのか問うUI
 */
export const CorrectCheck: React.FC = () => {
  const { aiState } = useUserMessages();
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [evaluationData, setEvaluationData] = useState<Evaluation[]>([]);

  /**
   * ストリーミングが終わったタイミングで evaluationData を取得する
   */
  const oldAiStateRef = useRef("");
  useEffect(() => {
    // プログラム開始直後
    if (oldAiStateRef.current === "") {
      oldAiStateRef.current = aiState;
      return;
    }

    const haveChanged = oldAiStateRef.current !== aiState; // 前回から状態変化した
    const isStreaming = oldAiStateRef.current === "streaming"; // 前の状態が"streaming"
    if (haveChanged && isStreaming) {
      const fetchData = async () => {
        const data = await requestApi("", a, { method: "GET" });
        setEvaluationData(data);
        setDeletedIds([]);
      };
      fetchData();
    }
    oldAiStateRef.current = aiState;
  }, [aiState]);

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
    const result = await semanticMatchJsonMoveAPI(id);
    if (result.success) {
      await semanticMatchJsonDeleteAPI(id);
    }
  };

  return (
    <div className="w-full flex-col justify-center">
      {evaluationData &&
        aiState === "ready" &&
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
