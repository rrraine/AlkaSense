import db from '../database';
import { EvaluationRecord, EvaluationStatus } from '../../shared/types/evaluation.types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class EvaluationRecordRepository {

  async create(sampleId: string, grainImageId: string): Promise<EvaluationRecord> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO evaluation_records (id, sample_id, grain_image_id, status)
       VALUES (?, ?, ?, 'OBSERVATION_ENTERED')`,
      [id, sampleId, grainImageId]
    );
    return this.getById(id);
  }

  async getById(id: string): Promise<EvaluationRecord> {
    const row = await db.getFirstAsync<EvaluationRecord>(
      `SELECT * FROM evaluation_records WHERE id = ?`, [id]
    );
    if (!row) throw new Error(`EvaluationRecord ${id} not found`);
    return row;
  }

  async getBySample(sampleId: string): Promise<EvaluationRecord[]> {
    return await db.getAllAsync<EvaluationRecord>(
      `SELECT * FROM evaluation_records WHERE sample_id = ? ORDER BY rowid ASC`,
      [sampleId]
    );
  }

  async updateStatus(id: string, status: EvaluationStatus): Promise<void> {
    await db.runAsync(
      `UPDATE evaluation_records SET status = ? WHERE id = ?`,
      [status, id]
    );
  }
}
