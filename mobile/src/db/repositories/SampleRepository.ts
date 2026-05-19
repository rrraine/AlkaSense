import db from '../database';

export type Sample = {
  id: string;
  session_id: string;
  variety_name: string;
  asv_score: number;
  gt_class: string;
  confidence: number;
  image_path: string;
  heatmap_path?: string;
  captured_at: string;
  synced: number;
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class SampleRepository {

  async create(data: Omit<Sample, 'id' | 'captured_at' | 'synced'>): Promise<Sample> {
    const id = generateUUID(); 

    // Transactional insert — if anything fails, nothing is saved
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO samples 
          (id, session_id, variety_name, asv_score, gt_class, confidence, image_path, heatmap_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.session_id,
          data.variety_name,
          data.asv_score,
          data.gt_class,
          data.confidence,
          data.image_path,
          data.heatmap_path ?? null,
        ]
      );

      // Audit log entry
      await db.runAsync(
        `INSERT INTO audit_log (id, action, entity, entity_id, details)
         VALUES (?, 'CREATE', 'sample', ?, ?)`,
        [
          generateUUID(), // 4. Replaced here
          id,
          JSON.stringify({ asv_score: data.asv_score, variety: data.variety_name })
        ]
      );
    });

    return this.getById(id);
  }

  async getById(id: string): Promise<Sample> {
    const row = await db.getFirstAsync<Sample>(
      `SELECT * FROM samples WHERE id = ?`, [id]
    );
    if (!row) throw new Error(`Sample ${id} not found`);
    return row;
  }

  async getBySession(sessionId: string): Promise<Sample[]> {
    return await db.getAllAsync<Sample>(
      `SELECT * FROM samples WHERE session_id = ? ORDER BY captured_at ASC`,
      [sessionId]
    );
  }

  async updateHeatmap(id: string, heatmapPath: string): Promise<void> {
    await db.runAsync(
      `UPDATE samples SET heatmap_path = ? WHERE id = ?`,
      [heatmapPath, id]
    );
  }

  async logCorrection(
    sampleId: string,
    originalScore: number,
    correctedScore: number,
    reason?: string
  ): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO correction_log (id, sample_id, original_score, corrected_score, reason)
         VALUES (?, ?, ?, ?, ?)`,
        [generateUUID(), sampleId, originalScore, correctedScore, reason ?? null] // 5. Replaced here
      );

      await db.runAsync(
        `INSERT INTO audit_log (id, action, entity, entity_id, details)
         VALUES (?, 'CORRECTION', 'sample', ?, ?)`,
        [
          generateUUID(), // 6. Replaced here
          sampleId,
          JSON.stringify({ from: originalScore, to: correctedScore, reason })
        ]
      );
    });
  }

  async getUnsynced(): Promise<Sample[]> {
    return await db.getAllAsync<Sample>(
      `SELECT * FROM samples WHERE synced = 0`
    );
  }

  async markSynced(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE samples SET synced = 1 WHERE id = ?`, [id]
    );
  }
}