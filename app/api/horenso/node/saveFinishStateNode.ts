import { Document } from "langchain/document";

import { HorensoMetadata, HorensoStates, SessionFlags } from "@/lib/type";

import * as MSG from "@/lib/contents/horenso/template";

type StateNode = {
  transition: HorensoStates;
  sessionFlags: SessionFlags;
  whoUseDocuments: Document<HorensoMetadata>[];
  whyUseDocuments: Document<HorensoMetadata>[];
};

export function saveFinishStateNode({
  transition,
  sessionFlags,
  whoUseDocuments,
  whyUseDocuments,
}: StateNode) {
  console.log(transition);

  // 正解し終わった場合すべてを初期化
  const contexts = [];
  if (transition.isAnswerCorrect && !transition.hasQuestion) {
    // 終了フラグ
    contexts.push(MSG.END_TAG);
    sessionFlags.phase = "cleared";

    // 初期化
    whoUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
    whyUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
  }

  // 現在の状態をリセット
  transition.isAnswerCorrect = false;

  return { contexts, updateSessionFlags: sessionFlags, transition };
}
