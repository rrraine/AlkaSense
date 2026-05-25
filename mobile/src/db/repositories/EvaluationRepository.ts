import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type EvaluationStatus =
  | 'For Evaluation'
  | 'Draft Generated'
  | 'Confirmed';

export interface EvaluationRecord {
  id: string;

  sample_id: string;

  grain_image_id: string | null;

  evaluator_id: string;

  spreading_pattern: string | null;
  grain_translucency: string | null;
  score_uniformity: string | null;

  anomaly_flags: string;

  koh_appearance: string | null;

  predicted_asv_score: number | null;
  predicted_gt_class: string | null;

  raw_confidence: number | null;
  calibrated_certainty: number | null;

  overlay_file_path: string | null;

  final_asv_score: number | null;
  final_gt_class: string | null;

  correction_remark: string | null;

  status: EvaluationStatus;

  evaluation_notes: string | null;

  created_at: string;
  evaluated_at: string | null;
}

export interface CreateEvaluationPayload {
  sample_id: string;

  grain_image_id?: string;

  evaluator_id: string;

  spreading_pattern?: string;
  grain_translucency?: string;
  score_uniformity?: string;

  anomaly_flags?: string[];

  koh_appearance?: string;

  predicted_asv_score?: number;
  predicted_gt_class?: string;

  raw_confidence?: number;
  calibrated_certainty?: number;

  overlay_file_path?: string;

  evaluation_notes?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateUUID(): string {

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, (c) => {

      const r = (Math.random() * 16) | 0;

      const v =
        c === 'x'
          ? r
          : (r & 0x3) | 0x8;

      return v.toString(16);
    });
}

// ─────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────

export class EvaluationRepository {

  // ───────────────────────────────────────────────────────────
  // Create Evaluation
  // ───────────────────────────────────────────────────────────

  async create(
    payload: CreateEvaluationPayload
  ): Promise<EvaluationRecord> {

    const id = generateUUID();

    await db.runAsync(
      `
      INSERT INTO evaluation_records (
        id,
        sample_id,
        grain_image_id,
        evaluator_id,

        spreading_pattern,
        grain_translucency,
        score_uniformity,

        anomaly_flags,

        koh_appearance,

        predicted_asv_score,
        predicted_gt_class,

        raw_confidence,
        calibrated_certainty,

        overlay_file_path,

        evaluation_notes,

        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,

        payload.sample_id,

        payload.grain_image_id ?? null,

        payload.evaluator_id,

        payload.spreading_pattern ?? null,
        payload.grain_translucency ?? null,
        payload.score_uniformity ?? null,

        JSON.stringify(
          payload.anomaly_flags ?? []
        ),

        payload.koh_appearance ?? null,

        payload.predicted_asv_score ?? null,
        payload.predicted_gt_class ?? null,

        payload.raw_confidence ?? null,
        payload.calibrated_certainty ?? null,

        payload.overlay_file_path ?? null,

        payload.evaluation_notes ?? null,

        'Draft Generated',
      ]
    );

    return await this.getById(id);
  }

  // ───────────────────────────────────────────────────────────
  // Get By ID
  // ───────────────────────────────────────────────────────────

  async getById(
    id: string
  ): Promise<EvaluationRecord> {

    const row =
      await db.getFirstAsync<EvaluationRecord>(
        `
        SELECT *
        FROM evaluation_records
        WHERE id = ?
        `,
        [id]
      );

    if (!row) {
      throw new Error(
        `Evaluation ${id} not found`
      );
    }

    return row;
  }

  // ───────────────────────────────────────────────────────────
  // Get By Sample
  // ───────────────────────────────────────────────────────────

  async getBySample(
    sampleId: string
  ): Promise<EvaluationRecord | null> {

    const row =
      await db.getFirstAsync<EvaluationRecord>(
        `
        SELECT *
        FROM evaluation_records
        WHERE sample_id = ?
        LIMIT 1
        `,
        [sampleId]
      );

    return row ?? null;
  }

  // ───────────────────────────────────────────────────────────
  // Confirm Evaluation
  // ───────────────────────────────────────────────────────────

  async confirmEvaluation(payload: {
    evaluationId: string;

    final_asv_score: number;

    final_gt_class: string;

    correction_remark?: string;
  }): Promise<void> {

    await db.runAsync(
      `
      UPDATE evaluation_records
      SET
        final_asv_score = ?,
        final_gt_class = ?,
        correction_remark = ?,
        status = 'Confirmed',
        evaluated_at = datetime('now')
      WHERE id = ?
      `,
      [
        payload.final_asv_score,

        payload.final_gt_class,

        payload.correction_remark ?? null,

        payload.evaluationId,
      ]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Get Confirmed Evaluations
  // ───────────────────────────────────────────────────────────

  async getConfirmedEvaluations(
    sessionId: string
  ): Promise<EvaluationRecord[]> {

    return await db.getAllAsync<EvaluationRecord>(
      `
      SELECT er.*
      FROM evaluation_records er

      INNER JOIN samples s
      ON er.sample_id = s.id

      WHERE
        s.session_id = ?
        AND er.status = 'Confirmed'
      `,
      [sessionId]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Delete Evaluation
  // ───────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {

    await db.runAsync(
      `
      DELETE FROM evaluation_records
      WHERE id = ?
      `,
      [id]
    );
  }
}