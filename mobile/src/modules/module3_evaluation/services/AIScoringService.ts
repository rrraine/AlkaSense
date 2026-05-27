// TEMPORARY: Real inference path is OnDeviceClassifier → react-native-fast-tflite.
// This service uses an inline mock until a native build environment is available.
// To restore: replace mockClassify() with:
//   import { classifyImage } from '../../../inference/OnDeviceClassifier';
//   const result = await classifyImage(request.image_path);

import { getDatabase } from '../../../db/database';
import {
  ClassificationRequest,
  ClassificationResult,
  DraftScore,
  ASVScore,
  GTClass,
} from '../../../shared/types/scoring.types';

// ─── GT lookup (mirrors CertaintyComputor — deterministic, not AI-predicted) ─
const GT_LOOKUP: Record<ASVScore, { gt_class: GTClass; gt_range: string }> = {
  1: { gt_class: 'LOW',          gt_range: '1–2' },
  2: { gt_class: 'LOW',          gt_range: '1–2' },
  3: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  4: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  5: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  6: { gt_class: 'HIGH',         gt_range: '6–7' },
  7: { gt_class: 'HIGH',         gt_range: '6–7' },
};

const LOW_CERTAINTY_THRESHOLD = 0.70;

// djb2 hash — same input always yields the same pseudo-random output
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

// Deterministic mock classifier — no native runtime dependency.
// Produces stable ASV scores and realistic confidence values from the image path.
async function mockClassify(imagePath: string): Promise<ClassificationResult> {
  await new Promise(r => setTimeout(r, 1500));

  const seed      = hashStr(imagePath || 'default');
  const confSeed  = hashStr(`${seed}-conf`);
  const certSeed  = hashStr(`${seed}-cert`);

  const asvScore: ASVScore = ((seed % 7) + 1) as ASVScore;

  // raw_confidence: 0.45–0.95 range
  const raw_confidence = 0.45 + ((confSeed % 1000) / 1000) * 0.50;

  // certainty_score: raw_confidence ± small calibration offset (–0.05 to +0.15)
  const certAdj       = ((certSeed % 200) / 1000) - 0.05;
  const certainty_score = Math.max(0, Math.min(1, raw_confidence + certAdj));

  const low_certainty_flag = certainty_score < LOW_CERTAINTY_THRESHOLD;

  const { gt_class, gt_range } = GT_LOOKUP[asvScore];

  return { asv_score: asvScore, gt_class, gt_range, raw_confidence, certainty_score, low_certainty_flag };
}

export async function requestAIDraft(request: ClassificationRequest): Promise<DraftScore> {
  const result = await mockClassify(request.image_path);

  const db = await getDatabase();
  const id = `draft-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO draft_scores
      (id, evaluation_id, asv_score, gt_class, gt_range, raw_confidence,
       certainty_score, low_certainty_flag, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      request.evaluation_id,
      result.asv_score,
      result.gt_class,
      result.gt_range,
      result.raw_confidence,
      result.certainty_score,
      result.low_certainty_flag ? 1 : 0,
    ]
  );

  await db.runAsync(
    `UPDATE evaluation_records SET status = 'DRAFT_GENERATED' WHERE id = ?`,
    [request.evaluation_id]
  );

  const row = await db.getFirstAsync<DraftScore>(
    'SELECT * FROM draft_scores WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Draft score insert failed');
  return row;
}

export async function getDraftByEvaluation(evaluationId: string): Promise<DraftScore | null> {
  const db = await getDatabase();
  return db.getFirstAsync<DraftScore>(
    'SELECT * FROM draft_scores WHERE evaluation_id = ? ORDER BY rowid DESC LIMIT 1',
    [evaluationId]
  );
}
