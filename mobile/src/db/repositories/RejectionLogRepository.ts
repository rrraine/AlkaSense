import db from '../database';

export type RejectionLogEntry = {
  id: string;
  grain_image_id: string;
  sample_id: string;
  rejection_layer: string;
  rejection_reason: string;
  evaluator_id: string;
  rejected_at: string;
};

type RejectionLogInput = Omit<RejectionLogEntry, 'id' | 'rejected_at'>;

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class RejectionLogRepository {

  async create(input: RejectionLogInput): Promise<RejectionLogEntry> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO rejection_log
         (id, grain_image_id, sample_id, rejection_layer, rejection_reason, evaluator_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.grain_image_id, input.sample_id, input.rejection_layer, input.rejection_reason, input.evaluator_id]
    );
    return this.getById(id);
  }

  async getById(id: string): Promise<RejectionLogEntry> {
    const row = await db.getFirstAsync<RejectionLogEntry>(
      `SELECT * FROM rejection_log WHERE id = ?`, [id]
    );
    if (!row) throw new Error(`RejectionLog ${id} not found`);
    return row;
  }

  async getBySample(sampleId: string): Promise<RejectionLogEntry[]> {
    return await db.getAllAsync<RejectionLogEntry>(
      `SELECT * FROM rejection_log WHERE sample_id = ? ORDER BY rejected_at DESC`,
      [sampleId]
    );
  }
}
