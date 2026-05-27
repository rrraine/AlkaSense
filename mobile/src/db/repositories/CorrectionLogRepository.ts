import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface CorrectionLog {
  id: string;
  session_id: string;
  sample_id: string;
  evaluator_id: string;
  original_asv_score: number;
  corrected_asv_score: number;
  correction_remark: string;
  submitted_at: string;
}

export interface CreateCorrectionLogPayload {
  session_id: string;
  sample_id: string;
  evaluator_id: string;
  original_asv_score: number;
  corrected_asv_score: number;
  correction_remark: string;
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

export class CorrectionLogRepository {

  async create(payload: CreateCorrectionLogPayload): Promise<CorrectionLog> {
    const id = generateUUID();

    await db.runAsync(
      `INSERT INTO correction_log (
        id, session_id, sample_id, evaluator_id,
        original_asv_score, corrected_asv_score, correction_remark
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.session_id,
        payload.sample_id,
        payload.evaluator_id,
        payload.original_asv_score,
        payload.corrected_asv_score,
        payload.correction_remark,
      ]
    );

    // DEBUG LOG | DELETE AFTERWARDS ---------------------------------
    const inserted = await db.getFirstAsync(
      `SELECT * FROM correction_log WHERE id = ?`,
      [id]
    );
    console.log('✅ CORRECTION LOG SAVED TO SQLITE:', JSON.stringify(inserted, null, 2));

    return await this.getById(id);
  }

  async getById(id: string): Promise<CorrectionLog> {
    const row = await db.getFirstAsync<CorrectionLog>(
      `SELECT * FROM correction_log WHERE id = ?`,
      [id]
    );
    if (!row) throw new Error(`CorrectionLog ${id} not found`);
    return row;
  }

  async getBySession(sessionId: string): Promise<CorrectionLog[]> {
    return await db.getAllAsync<CorrectionLog>(
      `SELECT * FROM correction_log WHERE session_id = ? ORDER BY submitted_at DESC`,
      [sessionId]
    );
  }

  async getBySample(sampleId: string): Promise<CorrectionLog[]> {
    return await db.getAllAsync<CorrectionLog>(
      `SELECT * FROM correction_log WHERE sample_id = ? ORDER BY submitted_at DESC`,
      [sampleId]
    );
  }

  async getAll(): Promise<CorrectionLog[]> {
    return await db.getAllAsync<CorrectionLog>(
      `SELECT * FROM correction_log ORDER BY submitted_at DESC`
    );
  }

  async countBySession(sessionId: string): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM correction_log WHERE session_id = ?`,
      [sessionId]
    );
    return row?.count ?? 0;
  }
}