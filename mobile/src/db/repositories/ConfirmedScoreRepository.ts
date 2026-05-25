import db from '../database';
import { ConfirmedScore } from '../../shared/types/scoring.types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type ConfirmedScoreRow = Omit<ConfirmedScore, 'ai_draft_used' | 'deviated_from_draft'> & {
  ai_draft_used: number;
  deviated_from_draft: number;
};

function deserialize(row: ConfirmedScoreRow): ConfirmedScore {
  return {
    ...row,
    ai_draft_used: row.ai_draft_used === 1,
    deviated_from_draft: row.deviated_from_draft === 1,
  };
}

type ConfirmedScoreInput = Omit<ConfirmedScore, 'id' | 'confirmed_at'>;

export class ConfirmedScoreRepository {

  async create(input: ConfirmedScoreInput): Promise<ConfirmedScore> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO confirmed_scores
         (id, evaluation_id, final_asv_score, gt_class, gt_range, ai_draft_used, deviated_from_draft, deviation_remark, confirming_evaluator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.evaluation_id,
        input.final_asv_score,
        input.gt_class,
        input.gt_range,
        input.ai_draft_used ? 1 : 0,
        input.deviated_from_draft ? 1 : 0,
        input.deviation_remark ?? null,
        input.confirming_evaluator_id,
      ]
    );
    return this.getByEvaluation(input.evaluation_id) as Promise<ConfirmedScore>;
  }

  async getByEvaluation(evaluationId: string): Promise<ConfirmedScore | null> {
    const row = await db.getFirstAsync<ConfirmedScoreRow>(
      `SELECT * FROM confirmed_scores WHERE evaluation_id = ?`, [evaluationId]
    );
    return row ? deserialize(row) : null;
  }
}
