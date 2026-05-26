import db from '../database';
import * as Crypto from 'expo-crypto';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type RejectionLayer = 'Protocol' | 'Quality';

export interface RejectionLogRecord {
  id: string;
  grain_image_id: string;
  evaluator_id: string;
  rejection_layer: RejectionLayer;
  checklist_uv_light: boolean;
  checklist_white_tray: boolean;
  checklist_single_layer: boolean;
  checklist_frame_aligned: boolean;
  failed_condition: string;
  rejection_reason: string;
  validation_timestamp: number;
  logged_at: string;
}

export interface CreateRejectionLogPayload {
  grain_image_id: string;
  evaluator_id: string;
  rejection_layer: RejectionLayer;
  checklist_uv_light: boolean;
  checklist_white_tray: boolean;
  checklist_single_layer: boolean;
  checklist_frame_aligned: boolean;
  failed_condition: string;
  rejection_reason: string;
  validation_timestamp: number;
}

// ─────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────

export class RejectionLogRepository {
  
  async create(payload: CreateRejectionLogPayload): Promise<RejectionLogRecord> {
    const id = Crypto.randomUUID();

    await db.runAsync(
      `INSERT INTO rejection_log (
        id,
        grain_image_id,
        evaluator_id,
        rejection_layer,
        checklist_uv_light,
        checklist_white_tray,
        checklist_single_layer,
        checklist_frame_aligned,
        failed_condition,
        rejection_reason,
        validation_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.grain_image_id,
        payload.evaluator_id,
        payload.rejection_layer,
        payload.checklist_uv_light ? 1 : 0,
        payload.checklist_white_tray ? 1 : 0,
        payload.checklist_single_layer ? 1 : 0,
        payload.checklist_frame_aligned ? 1 : 0,
        payload.failed_condition,
        payload.rejection_reason,
        payload.validation_timestamp,
      ]
    );

    return this.getById(id);
  }

  async getById(id: string): Promise<RejectionLogRecord> {
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM rejection_log WHERE id = ?`,
      [id]
    );
    if (!row) throw new Error(`RejectionLog not found: ${id}`);
    return this.mapRow(row);
  }

  async getByGrainImageId(grainImageId: string): Promise<RejectionLogRecord | null> {
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM rejection_log WHERE grain_image_id = ?`,
      [grainImageId]
    );
    return row ? this.mapRow(row) : null;
  }

  async getBySampleId(sampleId: string): Promise<RejectionLogRecord[]> {
    const rows = await db.getAllAsync<any>(
      `SELECT rl.*
       FROM rejection_log rl
       JOIN grain_images gi ON gi.id = rl.grain_image_id
       WHERE gi.sample_id = ?
       ORDER BY rl.validation_timestamp DESC`,
      [sampleId]
    );
    return rows.map(this.mapRow);
  }

  async getByEvaluatorId(evaluatorId: string): Promise<RejectionLogRecord[]> {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM rejection_log WHERE evaluator_id = ? ORDER BY validation_timestamp DESC`,
      [evaluatorId]
    );
    return rows.map(this.mapRow);
  }

  private mapRow(row: any): RejectionLogRecord {
    return {
      id: row.id,
      grain_image_id: row.grain_image_id,
      evaluator_id: row.evaluator_id,
      rejection_layer: row.rejection_layer as RejectionLayer,
      checklist_uv_light: Boolean(row.checklist_uv_light),
      checklist_white_tray: Boolean(row.checklist_white_tray),
      checklist_single_layer: Boolean(row.checklist_single_layer),
      checklist_frame_aligned: Boolean(row.checklist_frame_aligned),
      failed_condition: row.failed_condition,
      rejection_reason: row.rejection_reason,
      validation_timestamp: row.validation_timestamp,
      logged_at: row.logged_at,
    };
  }
}