import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

import { useUserMessages } from "../messages/message-provider";
import { UserAnswerEvaluation } from "@/lib/type";
import { Button } from "../ui/button";
import {
  getUserAnswerDataApi,
  semanticMatchJsonDeleteAPI,
  semanticMatchJsonMoveAPI,
} from "@/lib/api/api";

/**
 * 前ターンに正解を出したユーザーの答えは正しいのか問うUI
 */
export const CorrectCheck: React.FC = () => {
  const { aiState } = useUserMessages();
  const [oldAiState, setOldAiState] = useState("");
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [userAnswerData, setUserAnswerData] = useState<UserAnswerEvaluation[]>(
    []
  );

  /**
   * ストリーミングが終わったタイミングで userAnswerData を取得する
   */
  useEffect(() => {
    // プログラム開始直後
    if (oldAiState === "") {
      setOldAiState(aiState);
      return;
    }

    const haveChanged = !(oldAiState === aiState); // 前回から状態変化した
    const isStreaming = oldAiState === "streaming"; // 前の状態が"streaming"
    if (haveChanged && isStreaming) {
      const fetchData = async () => {
        const res = await getUserAnswerDataApi();
        const json = await res.json();
        setUserAnswerData(json);
        setDeletedIds([]);
      };
      fetchData();
    }
    setOldAiState(aiState);
  }, [aiState]);

  // 削除をはいと答えた時の動作
  const handleDeleteYes = (id: string) => {
    setDeletedIds((prev) => [...prev, id]);
    userAnswerData.filter((item) => item.semanticId !== id);
  };

  // 削除をいいえといったときの動作
  const handleDeleteNo = async (id: string) => {
    setDeletedIds((prev) => [...prev, id]);
    userAnswerData.filter((item) => item.semanticId !== id);

    // 記述を不正解リストに移動
    const result = await semanticMatchJsonMoveAPI(id);
    if (result.success) {
      await semanticMatchJsonDeleteAPI(id);
    }
  };

  return (
    <div className="w-full flex-col justify-center">
      {userAnswerData &&
        aiState === "ready" &&
        userAnswerData.map((data, index) => (
          <motion.div
            key={data.semanticId + uuidv4()}
            className="text-sm text-zinc-500 bg-blue-200 mb-2 px-4 py-2 rounded"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            {data.semanticId ? (
              <>
                {deletedIds.includes(data.semanticId!) ? (
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
                          onClick={() => handleDeleteYes(data.semanticId!)}
                          variant={"check"}
                          className="mr-2"
                        >
                          yes
                        </Button>
                        <Button
                          onClick={async () =>
                            await handleDeleteNo(data.semanticId!)
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
                        {data.userAnswer}
                      </span>
                    </div>
                    <div>
                      正答:{" "}
                      <span className="text-zinc-700 font-bold">
                        {data.currentAnswer}
                      </span>
                    </div>
                    <div>
                      正解の理由:{" "}
                      <span className="text-zinc-700 font-bold">
                        {data.semanticReason}
                      </span>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div>
                <span>この回答はすでに正しい回答として判定されています。</span>
                <p className="text-zinc-700 font-bold">
                  「 {data.userAnswer} 」
                </p>
              </div>
            )}
          </motion.div>
        ))}
    </div>
  );
};
