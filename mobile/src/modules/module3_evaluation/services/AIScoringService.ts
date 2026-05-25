import { getDatabase } from '../../../db/database';
import { classifyImage } from '../../../inference/OnDeviceClassifier';
import {
  ClassificationRequest,
  DraftScore,
} from '../../../shared/types/scoring.types';

export async function requestAIDraft(request: ClassificationRequest): Promise<DraftScore> {
  const result = await classifyImage(request.image_path);

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
