import db from '../database';
import { GrainImageRecord, ImageSubmissionPayload, ValidationStatus } from '../../shared/types/image.types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Target schema: grain_images table with submission_status / validation_status columns.
// The existing legacy grain_images table uses image_type CHECK ('raw','heatmap','annotated').
// This repository targets the ARCHITECTURE.md schema; a migration will reconcile the tables
// once the legacy grain_images table is dropped in a future step.
export class GrainImageRepository {

  async create(payload: ImageSubmissionPayload): Promise<GrainImageRecord> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO grain_images (id, sample_id, image_path, submission_status, validation_status, rejection_layer, rejection_reason, validation_timestamp)
       VALUES (?, ?, ?, 'PENDING', NULL, NULL, NULL, NULL)`,
      [id, payload.sample_id, payload.image_path]
    );
    return this.getById(id);
  }

  async getById(id: string): Promise<GrainImageRecord> {
    const row = await db.getFirstAsync<GrainImageRecord>(
      `SELECT * FROM grain_images WHERE id = ?`, [id]
    );
    if (!row) throw new Error(`GrainImage ${id} not found`);
    return row;
  }

  async getBySample(sampleId: string): Promise<GrainImageRecord[]> {
    return await db.getAllAsync<GrainImageRecord>(
      `SELECT * FROM grain_images WHERE sample_id = ? ORDER BY rowid ASC`,
      [sampleId]
    );
  }

  async setValidationResult(
    id: string,
    status: ValidationStatus,
    rejectionLayer: string | null,
    rejectionReason: string | null
  ): Promise<void> {
    await db.runAsync(
      `UPDATE grain_images
       SET validation_status = ?, rejection_layer = ?, rejection_reason = ?,
           validation_timestamp = datetime('now')
       WHERE id = ?`,
      [status, rejectionLayer, rejectionReason, id]
    );
  }
}
