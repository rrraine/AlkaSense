import { getDatabase } from '../../../db/database';
import {
  ConfirmedScore,
  ASVScore,
  GTClass,
} from '../../../shared/types/scoring.types';

const GT_LOOKUP: Record<ASVScore, { gt_class: GTClass; gt_range: string }> = {
  1: { gt_class: 'LOW',          gt_range: '1–2' },
  2: { gt_class: 'LOW',          gt_range: '1–2' },
  3: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  4: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  5: { gt_class: 'INTERMEDIATE', gt_range: '3–5' },
  6: { gt_class: 'HIGH',         gt_range: '6–7' },
  7: { gt_class: 'HIGH',         gt_range: '6–7' },
};

export type ConfirmationInput = {
  evaluationId: string;
  finalAsvScore: ASVScore;
  aiDraftUsed: boolean;
  draftAsvScore?: ASVScore;
  deviationRemark?: string;
  confirmingEvaluatorId: string;
};

export function buildConfirmationPayload(
  input: ConfirmationInput
): Omit<ConfirmedScore, 'id' | 'confirmed_at'> {
  const { gt_class, gt_range } = GT_LOOKUP[input.finalAsvScore];
  const deviatedFromDraft =
    input.aiDraftUsed && input.draftAsvScore !== undefined
      ? input.finalAsvScore !== input.draftAsvScore
      : false;

  return {
    evaluation_id: input.evaluationId,
    final_asv_score: input.finalAsvScore,
    gt_class,
    gt_range,
    ai_draft_used: input.aiDraftUsed,
    deviated_from_draft: deviatedFromDraft,
    deviation_remark: input.deviationRemark ?? null,
    confirming_evaluator_id: input.confirmingEvaluatorId,
  };
}

export async function submitConfirmation(input: ConfirmationInput): Promise<ConfirmedScore> {
  const payload = buildConfirmationPayload(input);
  const db = await getDatabase();
  const id = `conf-${Date.now()}`;

  await db.runAsync(
    `INSERT INTO confirmed_scores
      (id, evaluation_id, final_asv_score, gt_class, gt_range, ai_draft_used,
       deviated_from_draft, deviation_remark, confirming_evaluator_id, confirmed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    [
      id,
      payload.evaluation_id,
      payload.final_asv_score,
      payload.gt_class,
      payload.gt_range,
      payload.ai_draft_used ? 1 : 0,
      payload.deviated_from_draft ? 1 : 0,
      payload.deviation_remark,
      payload.confirming_evaluator_id,
    ]
  );

  await db.runAsync(
    `UPDATE evaluation_records SET status = 'CONFIRMED' WHERE id = ?`,
    [input.evaluationId]
  );

  await db.runAsync(
    `UPDATE samples SET status = 'CONFIRMED' WHERE id = (
       SELECT sample_id FROM evaluation_records WHERE id = ?
     )`,
    [input.evaluationId]
  );

  const row = await db.getFirstAsync<ConfirmedScore>(
    'SELECT * FROM confirmed_scores WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Confirmed score insert failed');
  return row;
}

export async function getConfirmedScoreByEvaluation(
  evaluationId: string
): Promise<ConfirmedScore | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ConfirmedScore>(
    'SELECT * FROM confirmed_scores WHERE evaluation_id = ?',
    [evaluationId]
  );
}
