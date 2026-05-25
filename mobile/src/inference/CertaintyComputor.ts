import { ASVScore, GTClass } from '../shared/types/scoring.types';

const TEMPERATURE = 1.5;
const LOW_CERTAINTY_THRESHOLD = 0.70;

// IRRI ASV → GT class lookup — deterministic, never predicted by CNN
const GT_LOOKUP: Record<ASVScore, { gt_class: GTClass; gt_range: string }> = {
  1: { gt_class: 'LOW',          gt_range: '1–2' },
  2: { gt_class: 'LOW',          gt_range: '1–2' },
  3: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  4: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  5: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  6: { gt_class: 'HIGH',         gt_range: '6–7' },
  7: { gt_class: 'HIGH',         gt_range: '6–7' },
};

export type CertaintyResult = {
  asv_score: ASVScore;
  gt_class: GTClass;
  gt_range: string;
  raw_confidence: number;
  certainty_score: number;
  low_certainty_flag: boolean;
};

export class CertaintyComputor {

  compute(rawLogits: number[]): CertaintyResult {
    const scaled = rawLogits.map(l => l / TEMPERATURE);
    const probs = softmax(scaled);

    const maxIdx = probs.indexOf(Math.max(...probs));
    const asv_score = (maxIdx + 1) as ASVScore;
    const raw_confidence = probs[maxIdx];

    const certainty_score = calibratedCertainty(probs);
    const low_certainty_flag = certainty_score < LOW_CERTAINTY_THRESHOLD;

    const { gt_class, gt_range } = GT_LOOKUP[asv_score];

    return { asv_score, gt_class, gt_range, raw_confidence, certainty_score, low_certainty_flag };
  }
}

function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

// One-minus-entropy certainty: 1 means perfectly confident, 0 means max entropy
function calibratedCertainty(probs: number[]): number {
  const entropy = -probs.reduce((acc, p) => acc + (p > 0 ? p * Math.log(p) : 0), 0);
  const maxEntropy = Math.log(probs.length);
  return 1 - entropy / maxEntropy;
}
