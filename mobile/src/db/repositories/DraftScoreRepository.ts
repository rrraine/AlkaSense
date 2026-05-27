import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface DraftScore {
  id: string;
  eval_record_id: string;

  predicted_asv_score: number;
  predicted_gt_class: string;

  raw_confidence: number;
  calibrated_certainty: number;

  overlay_file_path: string | null;

  has_confidence_warning: number;      // 0 | 1
  has_observation_conflict: number;    // 0 | 1

  conflict_dimensions: string;         // JSON string

  remark_conflict_resolution: string | null;
}

export interface CreateDraftScorePayload {
  eval_record_id: string;

  predicted_asv_score: number;
  predicted_gt_class: string;

  raw_confidence: number;
  calibrated_certainty: number;

  overlay_file_path?: string | null;

  has_confidence_warning: boolean;
  has_observation_conflict: boolean;

  conflict_dimensions?: string[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────

export class DraftScoreRepository {

  // ───────────────────────────────────────────────────────────
  // Create
  // ───────────────────────────────────────────────────────────

  async create(
    payload: CreateDraftScorePayload
  ): Promise<DraftScore> {

    const id = generateUUID();

    await db.runAsync(
      `
      INSERT INTO draft_scores (
        id,
        eval_record_id,

        predicted_asv_score,
        predicted_gt_class,

        raw_confidence,
        calibrated_certainty,

        overlay_file_path,

        has_confidence_warning,
        has_observation_conflict,
        conflict_dimensions
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        payload.eval_record_id,

        payload.predicted_asv_score,
        payload.predicted_gt_class,

        payload.raw_confidence,
        payload.calibrated_certainty,

        payload.overlay_file_path ?? null,

        payload.has_confidence_warning ? 1 : 0,
        payload.has_observation_conflict ? 1 : 0,

        JSON.stringify(payload.conflict_dimensions ?? []),
      ]
    );

    const created = await this.getByEvalRecord(payload.eval_record_id);

    if (!created) {
      throw new Error(
        `DraftScoreRepository.create: failed to read back row for evaluation ${payload.eval_record_id}`
      );
    }

    return created;
  }

  // ───────────────────────────────────────────────────────────
  // Get By Evaluation Record
  // ───────────────────────────────────────────────────────────

  async getByEvalRecord(
    evalRecordId: string
  ): Promise<DraftScore | null> {

    const row = await db.getFirstAsync<DraftScore>(
      `
      SELECT *
      FROM draft_scores
      WHERE eval_record_id = ?
      LIMIT 1
      `,
      [evalRecordId]
    );

    if (!row) return null;

    return {
      ...row,
      conflict_dimensions: row.conflict_dimensions ?? '[]',
    };
  }
}