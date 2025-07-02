import { HorensoStates } from "@/lib/type";
import { Document } from "langchain/document";

// 質問ドキュメント1
export const whoDocuments: Document[] = [
  {
    pageContent: "リーダー",
    metadata: {
      id: "1",
      parentId: "1",
      question_id: "1",
      question: "報連相は誰のためか",
      isMatched: false,
    },
  },
  {
    pageContent: "上司",
    metadata: {
      id: "2",
      parentId: "1",
      question_id: "1",
      question: "報連相は誰のためか",
      isMatched: false,
    },
  },
];

// 質問ドキュメント2: 「納期」「仕様」「品質」
export const whyDocuments: Document[] = [
  {
    pageContent: "納期や期限を守るために早めの情報共有が必要",
    metadata: {
      id: "1-1",
      parentId: "1",
      question_id: "2",
      question: "報連相はなぜリーダーのためなのか",
      isMatched: false,
    },
  },
  {
    pageContent:
      "機能の過不足がないように仕様のズレを防ぎ、適切な機能範囲を守る",
    metadata: {
      id: "2-1",
      parentId: "2",
      question_id: "2",
      question: "報連相はなぜリーダーのためなのか",
      isMatched: false,
    },
  },
  {
    pageContent: "品質を保証しバグを未然に防ぐ",
    metadata: {
      id: "3-1",
      parentId: "3",
      question_id: "2",
      question: "報連相はなぜリーダーのためなのか",
      isMatched: false,
    },
  },
];

// 質問ドキュメント2: 曖昧マッチング「納期」
export const supportingPhrasesDeadline = [
  // 加藤さんの回答
  "今の作業状況を知るため",
  "どこまでできているかを知るため",
  "いつごろ終わるか",
  "予定に間に合うか",
  "計画通りに進められるか",
  "計画通りに終われるか",
  "期限内に終われるか",
  "期限を守れるか",
  // 折原回答
  "納期や期限を守るため",
];

// 質問ドキュメント2: 曖昧マッチング「仕様」
export const supportingPhrasesSpecification = [
  // 加藤さんの回答
  "要求通りのものをつくることだと思います",
  "機能漏れを防ぐ必要があると思います",
  "機能に不足がないようにすること",
  "余分なものを作らないようにすることかな？",
  // 言い回しがあいまい or 抽象的な例
  "ズレがあると困ると思います",
  "思ってたものと違うって言われないようにすることですかね",
  "後で直すの大変なので…",
  "要望と合ってるか確認するためかな",
  "認識のずれを無くすためじゃないですか？",
  "発注者とのすれ違いをなくすため？",
  "作り直しを防ぐためかな",
  // 一部の観点（過不足の片方）にだけ触れてる例
  "入れ忘れがあると問題になると思うので",
  "余計なもの入れちゃうと時間かかりますよね",
  "必要な機能が抜けてたら困るからです",
  "盛り込みすぎて開発が遅れるのを防ぐため",
  // 推測や自信なさげなトーン
  "たぶん、想定と違う動きになるのを防ぐため？",
  "意図をちゃんと理解するためだと思います",
  "これってお客さんの希望に合わせるって意味ですか？",
];

// 質問ドキュメント2: 曖昧マッチング「品質」
export const supportingPhrasesQuality = [
  // 加藤さんの回答
  "バグを流出させない",
  "バグを見つけて流出させない",
  "バグを作らないようにする",
  // バグ予防・検出を暗示するもの
  "あとで不具合にならないようにするため",
  "ミスがあっても早めに気づけるようにするため",
  "変な挙動を防ぐためだと思います",
  "ちゃんと動くかどうか確認するためかな",
  "不具合を早く潰すためだと思います",
  // 品質を明示的に語らずに表現している例
  "後戻りを減らすため",
  "クレームを避けるためじゃないですか？",
  "信用を失わないようにするためですかね",
  "品質のバラつきをなくすため？",
  "使ってみてガッカリされないようにするため？",
  // 自信なさげ・推測ベースだけど意図は合っている例
  "多分、ちゃんとチェックするためじゃないですか？",
  "品質っていうか、不安定な動きにならないように？",
  "コードの漏れをなくすってこと？",
  "想定通りの動きをするか確認する意味ですかね？",
];

// 状態保持用
export const defaultTransitionStates: HorensoStates = {
  isAnswerCorrect: false,
  hasQuestion: true,
  step: 0,
};
