import { Document } from "langchain/document";

import { HorensoMetadata, HorensoStates, SessionFlags } from "@/lib/type";

import * as MSG from "@/lib/contents/horenso/template";
import * as DOC from "@/lib/contents/horenso/documents";

type StateNode = {
  states: HorensoStates;
  transition: HorensoStates;
  sessionFlags: SessionFlags;
  whoUseDocuments: Document<HorensoMetadata>[];
  whyUseDocuments: Document<HorensoMetadata>[];
};

export function saveFinishStateNode({
  states,
  transition,
  sessionFlags,
  whoUseDocuments,
  whyUseDocuments,
}: StateNode) {
  // 現在の状態を外部保存
  Object.assign(states, transition);
  states.isAnswerCorrect = false;

  // 正解し終わった場合すべてを初期化
  const contexts = [];
  if (!transition.hasQuestion) {
    // 終了フラグ
    console.log("質問終了");
    contexts.push(MSG.END_TAG);
    sessionFlags.state = "cleared";

    // 初期化
    Object.assign(states, DOC.defaultTransitionStates);
    whoUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
    whyUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
  }

  return { contexts, updateSessionFlags: sessionFlags };
}
