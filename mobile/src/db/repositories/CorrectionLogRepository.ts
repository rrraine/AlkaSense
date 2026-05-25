import db from '../database';
import { CorrectionLog, CorrectionPayload } from '../../shared/types/correction.types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Target schema: correction_log columns match ARCHITECTURE.md (confirmed_score_id, corrected_asv_score, etc.)
// The legacy correction_log table uses (sample_id, original_score, corrected_score, reason).
// This repository targets the ARCHITECTURE.md schema and will become active once the legacy
// table is replaced in a future migration step.
export class CorrectionLogRepository {

  async create(payload: CorrectionPayload): Promise<CorrectionLog> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO correction_log
         (id, confirmed_score_id, session_id, sample_id, original_asv_score,
          corrected_asv_score, correction_remark, submitting_evaluator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.confirmed_score_id,
        payload.session_id,
        payload.sample_id,
        payload.original_asv_score,
        payload.corrected_asv_score,
        payload.correction_remark ?? null,
        payload.submitting_evaluator_id,
      ]
    );
    return this.getById(id);
  }

  async getById(id: string): Promise<CorrectionLog> {
    const row = await db.getFirstAsync<CorrectionLog>(
      `SELECT * FROM correction_log WHERE id = ?`, [id]
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
}
