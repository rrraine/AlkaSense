import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ObservationProfile {
  id: string;
  eval_record_id: string;
  spreading_pattern: string;
  grain_translucency: string;
  score_uniformity: string;
  anomaly_flags: string; // JSON string
  koh_appearance: string;
}

export interface CreateObservationProfilePayload {
  eval_record_id: string;
  spreading_pattern?: string | null;
  grain_translucency?: string | null;
  score_uniformity?: string | null;
  anomaly_flags?: string[];
  koh_appearance?: string | null;
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

export class ObservationProfileRepository {

  // ───────────────────────────────────────────────────────────
  // Create
  // ───────────────────────────────────────────────────────────

  async create(
    payload: CreateObservationProfilePayload
  ): Promise<ObservationProfile> {

    const id = generateUUID();

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
        id,
        payload.eval_record_id,
        payload.spreading_pattern  ?? 'No Spreading',
        payload.grain_translucency ?? 'Opaque',
        payload.score_uniformity   ?? 'High Variation',
        JSON.stringify(payload.anomaly_flags ?? []),
        payload.koh_appearance     ?? 'Clear',
      ]
    );

    const created = await this.getByEvalRecord(payload.eval_record_id);

    if (!created) {
      throw new Error(
        `ObservationProfileRepository.create: failed to read back row for evaluation ${payload.eval_record_id}`
      );
    }

    return created;
  }

  // ───────────────────────────────────────────────────────────
  // Get By Evaluation Record
  // ───────────────────────────────────────────────────────────

  async getByEvalRecord(
    evalRecordId: string
  ): Promise<ObservationProfile | null> {

    const row = await db.getFirstAsync<ObservationProfile>(
      `
      SELECT *
      FROM observation_profiles
      WHERE eval_record_id = ?
      LIMIT 1
      `,
      [evalRecordId]
    );

    if (!row) return null;

    return {
      ...row,
      anomaly_flags: row.anomaly_flags ?? '[]',
    };
  }
}