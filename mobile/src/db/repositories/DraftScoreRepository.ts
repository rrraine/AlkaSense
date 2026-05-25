import db from '../database';
import { DraftScore } from '../../shared/types/scoring.types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type DraftScoreRow = Omit<DraftScore, 'low_certainty_flag'> & { low_certainty_flag: number };

function deserialize(row: DraftScoreRow): DraftScore {
  return { ...row, low_certainty_flag: row.low_certainty_flag === 1 };
}

type DraftScoreInput = Omit<DraftScore, 'id' | 'created_at'>;

export class DraftScoreRepository {

  async create(input: DraftScoreInput): Promise<DraftScore> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO draft_scores
         (id, evaluation_id, asv_score, gt_class, gt_range, raw_confidence, certainty_score, low_certainty_flag)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.evaluation_id,
        input.asv_score,
        input.gt_class,
        input.gt_range,
        input.raw_confidence,
        input.certainty_score,
        input.low_certainty_flag ? 1 : 0,
      ]
    );
    return this.getByEvaluation(input.evaluation_id) as Promise<DraftScore>;
  }

  async getByEvaluation(evaluationId: string): Promise<DraftScore | null> {
    const row = await db.getFirstAsync<DraftScoreRow>(
      `SELECT * FROM draft_scores WHERE evaluation_id = ? ORDER BY created_at DESC LIMIT 1`,
      [evaluationId]
    );
    return row ? deserialize(row) : null;
  }
}
