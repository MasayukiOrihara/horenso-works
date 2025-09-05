// -----------------------------
// 型

import { AnswerStatusRepo } from "@/lib/supabase/repositories/answerStatus.repo";
import { QuestionStatsRepo } from "@/lib/supabase/repositories/questionStats.repo";

// -----------------------------
type AnswerRow = {
  question_id: string; // "1" | "2" ...
  max_vector: number; // [0,1] 想定（類似度）
};

type StatsRow = {
  question_id: string; // "1" | "2" ...
  retry_count: number; // attempts: 1=一発正解
  hint_count: number; // 使用ヒント数
};

type DbError = { message: string; code?: string };
type Result<T> = { ok: true; value: T } | { ok: false; error: DbError };

// -----------------------------
// パラメータ
// -----------------------------
const W = { wa: 0.6, wh: 0.2, wr: 0.2 } as const; // 合計=1
const HINT_ALPHA = 0.2;
const RETRY_BETA = 0.6;
const RETRY_RMIN = 0.35;

// 問題ごとの難易度係数 D_q（例：2問目を重めに）
const DIFFICULTY: Record<string, number> = {
  "1": 0.8,
  "2": 1.2,
};

// -----------------------------
// スコア関数（部分正解は min 集約で acc を決める）
// -----------------------------
function accMin(similarities: number[]): number {
  if (!similarities.length) return 0; // データなければ0
  const a = Math.min(...similarities);
  return Math.max(0, Math.min(1, a)); // 念のため [0,1] クリップ
}

function hintScoreLinear(hintCount: number, alpha = HINT_ALPHA) {
  return Math.max(0, 1 - alpha * hintCount);
}

function retryScore(attempts: number, beta = RETRY_BETA, rMin = RETRY_RMIN) {
  if (attempts <= 1) return 1; // 一発正解は満点
  return Math.max(rMin, Math.pow(attempts, -beta));
}

// -----------------------------
// ユーティリティ
// -----------------------------
function groupVectorsByQuestion(rows: AnswerRow[]): Map<string, number[]> {
  const m = new Map<string, number[]>();
  for (const r of rows) {
    if (!m.has(r.question_id)) m.set(r.question_id, []);
    m.get(r.question_id)!.push(r.max_vector);
  }
  return m;
}

function indexStatsByQuestion(
  rows: StatsRow[]
): Map<string, { attempts: number; hints: number }> {
  const m = new Map<string, { attempts: number; hints: number }>();
  for (const r of rows) {
    m.set(r.question_id, {
      attempts: r.retry_count ?? 1,
      hints: r.hint_count ?? 0,
    });
  }
  return m;
}

// -----------------------------
// メイン：最終スコア（選択肢A：加重平均）
// -----------------------------
export async function computeFinalScoreWeightedAverage(sessionId: string) {
  // 1) ベクトル（類似度）取得
  const r1: Result<AnswerRow[]> = await AnswerStatusRepo.listBySession(
    sessionId
  );

  // 2) リトライ/ヒント取得
  const r2: Result<StatsRow[]> = await QuestionStatsRepo.listBySession(
    sessionId
  );

  if (!r1.ok) {
    console.error("[answers.listBySession]", r1.error);
  }
  if (!r2.ok) {
    console.error("[question.listBySession]", r2.error);
  }

  // フォールバック（失敗時も動くように）
  const answerRows: AnswerRow[] = r1.ok
    ? r1.value
    : [
        { question_id: "1", max_vector: 0.5 },
        { question_id: "2", max_vector: 0.5 },
      ];
  const statsRows: StatsRow[] = r2.ok
    ? r2.value
    : [
        { question_id: "1", retry_count: 1, hint_count: 0 },
        { question_id: "2", retry_count: 1, hint_count: 0 },
      ];

  // 質問ごとに集約
  const vecsByQ = groupVectorsByQuestion(answerRows);
  const statsByQ = indexStatsByQuestion(statsRows);

  type PerQ = {
    qid: string;
    acc: number;
    H: number;
    R: number;
    s: number; // 素点 s_q
    D: number; // 難易度係数
  };

  const perQuestion: PerQ[] = [];

  // vecsByQ に現れている全 question_id を採用（必要なら固定集合 ["1","2"] を回してもOK）
  const qids = new Set<string>([...vecsByQ.keys(), ...statsByQ.keys()]);
  for (const qid of qids) {
    const similarities = vecsByQ.get(qid) ?? []; // その問題の部分正解候補との類似度たち
    const meta = statsByQ.get(qid) ?? { attempts: 1, hints: 0 };

    const acc = accMin(similarities);
    const H = hintScoreLinear(meta.hints);
    const R = retryScore(meta.attempts);

    const s = W.wa * acc + W.wh * H + W.wr * R; // 0..1 想定の素点
    const D = DIFFICULTY[qid] ?? 1.0;

    perQuestion.push({ qid, acc, H, R, s, D });
  }

  if (perQuestion.length === 0) {
    return { final: 0, perQuestion: [] as PerQ[] };
  }

  // ★ 選択肢A：難問を“重み”として加重平均（正規化方式：0..1 レンジ維持）
  const num = perQuestion.reduce((acc, x) => acc + x.s * x.D, 0);
  const den = perQuestion.reduce((acc, x) => acc + x.D, 0);
  const final = den > 0 ? num / den : 0; // 0..1 のまま

  return { final, perQuestion };
}

// -----------------------------
// 使い方
// -----------------------------
// const { final, perQuestion } = await computeFinalScoreWeightedAverage(sessionId);
// console.log("perQuestion:", perQuestion);
// console.log("final(0..1):", final, " => 100点満点:", Math.round(final * 100));
