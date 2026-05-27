import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type EvaluationStatus =
  | 'For Evaluation'
  | 'Draft Generated'
  | 'Confirmed';

/**
 * Flat merged view of evaluation_records + observation_profiles + draft_scores.
 * This is what callers receive — the split across three tables is an
 * internal repository concern.
 */
export interface EvaluationRecord {

  // evaluation_records
  id: string;
  sample_id: string;
  grain_image_id: string | null;
  evaluator_id: string;
  evaluation_notes: string | null;
  status: EvaluationStatus;
  created_at: string;
  evaluated_at: string | null;

  // observation_profiles
  observation_profile_id: string | null;
  spreading_pattern: string | null;
  grain_translucency: string | null;
  score_uniformity: string | null;
  anomaly_flags: string;
  koh_appearance: string | null;

  // draft_scores
  draft_score_id: string | null;

  predicted_asv_score: number | null;
  predicted_gt_class: string | null;

  raw_confidence: number | null;
  calibrated_certainty: number | null;

  overlay_file_path: string | null;

  has_confidence_warning: number | null;
  has_observation_conflict: number | null;

  conflict_dimensions: string;

  // confirmed fields
  final_asv_score: number | null;
  final_gt_class: string | null;
  correction_remark: string | null;
}

export interface CreateEvaluationPayload {

  sample_id: string;
  grain_image_id?: string | null;
  evaluator_id: string;

  evaluation_notes?: string;

  // observation_profiles fields
  spreading_pattern?: string | null;
  grain_translucency?: string | null;
  score_uniformity?: string | null;
  anomaly_flags?: string[];
  koh_appearance?: string | null;

  // draft_scores fields
  predicted_asv_score?: number | null;
  predicted_gt_class?: string | null;

  raw_confidence?: number | null;
  calibrated_certainty?: number | null;

  overlay_file_path?: string | null;

  has_confidence_warning?: boolean;
  has_observation_conflict?: boolean;

  conflict_dimensions?: string[];
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x'
      ? r
      : (r & 0x3) | 0x8;

    return v.toString(16);
  });
}

/**
 * Fetch merged evaluation record
 */
async function fetchMerged(
  evalId: string
): Promise<EvaluationRecord | null> {

  const row = await db.getFirstAsync<any>(
    `
    SELECT
      er.id,
      er.sample_id,
      er.grain_image_id,
      er.evaluator_id,
      er.evaluation_notes,
      er.status,
      er.created_at,
      er.evaluated_at,

      op.id AS observation_profile_id,
      op.spreading_pattern,
      op.grain_translucency,
      op.score_uniformity,
      op.anomaly_flags,
      op.koh_appearance,

      ds.id AS draft_score_id,

      ds.predicted_asv_score,
      ds.predicted_gt_class,

      ds.raw_confidence,
      ds.calibrated_certainty,

      ds.overlay_file_path,

      ds.has_confidence_warning,
      ds.has_observation_conflict,
      ds.conflict_dimensions,

      ds.remark_conflict_resolution AS correction_remark

    FROM evaluation_records er

    LEFT JOIN observation_profiles op
      ON op.eval_record_id = er.id

    LEFT JOIN draft_scores ds
      ON ds.eval_record_id = er.id

    WHERE er.id = ?
    `,
    [evalId]
  );

  if (!row) return null;

  return {
    ...row,

    anomaly_flags:
      row.anomaly_flags ?? '[]',

    conflict_dimensions:
      row.conflict_dimensions ?? '[]',

    final_asv_score:
      row.predicted_asv_score ?? null,

    final_gt_class:
      row.predicted_gt_class ?? null,

    correction_remark:
      row.correction_remark ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────

export class EvaluationRepository {

  // ───────────────────────────────────────────────────────────
  // Create
  // ───────────────────────────────────────────────────────────

  async create(
    payload: CreateEvaluationPayload
  ): Promise<EvaluationRecord> {

    const evalId = generateUUID();

    // ─────────────────────────────────────────────────────────
    // 1. Base evaluation record
    // ─────────────────────────────────────────────────────────

    await db.runAsync(
      `
      INSERT INTO evaluation_records (
        id,
        sample_id,
        grain_image_id,
        evaluator_id,
        evaluation_notes,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'Draft Generated')
      `,
      [
        evalId,
        payload.sample_id,
        payload.grain_image_id ?? null,
        payload.evaluator_id,
        payload.evaluation_notes ?? null,
      ]
    );

    // ─────────────────────────────────────────────────────────
    // 2. Observation profile
    // ─────────────────────────────────────────────────────────

    const hasObservation =
      payload.spreading_pattern  != null ||
      payload.grain_translucency != null ||
      payload.score_uniformity   != null ||
      payload.koh_appearance     != null ||
      (
        payload.anomaly_flags &&
        payload.anomaly_flags.length > 0
      );

    if (hasObservation) {

      const obsId = generateUUID();

      await db.runAsync(
        `
        INSERT INTO observation_profiles (
          id,
          eval_record_id,

          spreading_pattern,
          grain_translucency,
          score_uniformity,

          anomaly_flags,
          koh_appearance
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          obsId,
          evalId,

          payload.spreading_pattern
            ?? 'No Spreading',

          payload.grain_translucency
            ?? 'Opaque',

          payload.score_uniformity
            ?? 'High Variation',

          JSON.stringify(
            payload.anomaly_flags ?? []
          ),

          payload.koh_appearance
            ?? 'Clear',
        ]
      );
    }

    // ─────────────────────────────────────────────────────────
    // 3. Draft scores
    // ─────────────────────────────────────────────────────────

    const hasDraftScore =
      payload.predicted_asv_score  != null ||
      payload.raw_confidence       != null ||
      payload.calibrated_certainty != null;

    if (hasDraftScore) {

      const draftId = generateUUID();

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
          draftId,
          evalId,

          payload.predicted_asv_score
            ?? 0,

          payload.predicted_gt_class
            ?? 'Null',

          payload.raw_confidence
            ?? 0,

          payload.calibrated_certainty
            ?? 0,

          payload.overlay_file_path
            ?? null,

          payload.has_confidence_warning
            ? 1
            : 0,

          payload.has_observation_conflict
            ? 1
            : 0,

          JSON.stringify(
            payload.conflict_dimensions ?? []
          ),
        ]
      );
    }

    const record = await fetchMerged(evalId);

    if (!record) {
      throw new Error(
        `EvaluationRepository.create: failed to read back record ${evalId}`
      );
    }

    return record;
  }

  // ───────────────────────────────────────────────────────────
  // Get By ID
  // ───────────────────────────────────────────────────────────

  async getById(
    id: string
  ): Promise<EvaluationRecord> {

    const record = await fetchMerged(id);

    if (!record) {
      throw new Error(`Evaluation ${id} not found`);
    }

    return record;
  }

  // ───────────────────────────────────────────────────────────
  // Get By Sample
  // ───────────────────────────────────────────────────────────

  async getBySample(
    sampleId: string
  ): Promise<EvaluationRecord | null> {

    const row = await db.getFirstAsync<{ id: string }>(
      `
      SELECT id
      FROM evaluation_records
      WHERE sample_id = ?
      LIMIT 1
      `,
      [sampleId]
    );

    if (!row) return null;

    return fetchMerged(row.id);
  }

  // ───────────────────────────────────────────────────────────
  // Confirm Evaluation
  // ───────────────────────────────────────────────────────────

  async confirmEvaluation(payload: {
  evaluationId: string;
  final_asv_score: number;
  final_gt_class: string;
  correction_remark?: string;
  remark_score_deviation?: string;
}): Promise<void> {

  // update evaluation status

  await db.runAsync(
    `
    UPDATE evaluation_records
    SET
      status = 'Confirmed',
      evaluated_at = datetime('now')
    WHERE id = ?
    `,
    [payload.evaluationId]
  );

  // check if draft row exists

  const existing = await db.getFirstAsync<{ id: string }>(
    `
    SELECT id
    FROM draft_scores
    WHERE eval_record_id = ?
    `,
    [payload.evaluationId]
  );

  if (existing) {

    // update existing draft row

    await db.runAsync(
      `
      UPDATE draft_scores
      SET
        predicted_asv_score = ?,
        predicted_gt_class = ?,
        remark_conflict_resolution = ?,
        remark_score_deviation = ?
      WHERE eval_record_id = ?
      `,
      [
        payload.final_asv_score,
        payload.final_gt_class,

        payload.correction_remark ?? null,
        payload.remark_score_deviation ?? null,

        payload.evaluationId,
      ]
    );

  } else {

    // manual path fallback

    const draftId = generateUUID();

    await db.runAsync(
      `
      INSERT INTO draft_scores (
        id,
        eval_record_id,

        predicted_asv_score,
        predicted_gt_class,

        raw_confidence,
        calibrated_certainty,

        has_confidence_warning,
        has_observation_conflict,
        conflict_dimensions,

        remark_conflict_resolution,
        remark_score_deviation
      )
      VALUES (?, ?, ?, ?, 0, 0, 0, 0, '[]', ?, ?)
      `,
      [
        draftId,
        payload.evaluationId,

        payload.final_asv_score,
        payload.final_gt_class,

        payload.correction_remark ?? null,
        payload.remark_score_deviation ?? null,
      ]
    );
  }
}

  // ───────────────────────────────────────────────────────────
  // Get Confirmed Evaluations
  // ───────────────────────────────────────────────────────────

  async getConfirmedEvaluations(
    sessionId: string
  ): Promise<EvaluationRecord[]> {

    const rows = await db.getAllAsync<{ id: string }>(
      `
      SELECT er.id
      FROM evaluation_records er

      INNER JOIN samples s
        ON er.sample_id = s.id

      WHERE
        s.session_id = ?
        AND er.status = 'Confirmed'
      `,
      [sessionId]
    );

    const results: EvaluationRecord[] = [];

    for (const row of rows) {
      const record = await fetchMerged(row.id);

      if (record) {
        results.push(record);
      }
    }

    return results;
  }

  // ───────────────────────────────────────────────────────────
  // Delete
  // ───────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {

    // observation_profiles + draft_scores cascade

    await db.runAsync(
      `
      DELETE FROM evaluation_records
      WHERE id = ?
      `,
      [id]
    );
  }
}