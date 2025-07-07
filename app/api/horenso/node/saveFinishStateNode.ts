import { Document } from "langchain/document";

import * as DOC from "../contents/documents";
import * as MSG from "../contents/messages";
import { HorensoMetadata, HorensoStates } from "@/lib/type";

type StateNode = {
  states: HorensoStates;
  transition: HorensoStates;
  whoUseDocuments: Document<HorensoMetadata>[];
  whyUseDocuments: Document<HorensoMetadata>[];
};

export function saveFinishStateNode({
  states,
  transition,
  whoUseDocuments,
  whyUseDocuments,
}: StateNode) {
  // 現在の状態を外部保存
  Object.assign(states, transition);
  states.isAnswerCorrect = false;

  // 正解し終わった場合すべてを初期化
  const contexts = [];
  if (!transition.hasQuestion) {
    console.log("質問終了");
    contexts.push(MSG.END_TAG);
    Object.assign(states, DOC.defaultTransitionStates);
    whoUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
    whyUseDocuments.forEach((doc) => {
      doc.metadata.isMatched = false;
    });
  }

  return { contexts };
}
