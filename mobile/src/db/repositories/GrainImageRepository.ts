import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type ValidationStatus =
  | 'Accepted'
  | 'Protocol Violation'
  | 'Quality Failure';

export interface GrainImage {
  id: string;
  sample_id: string;
  file_path: string;
  validation_status: ValidationStatus;
  uploaded_at: string;
}

export interface CreateGrainImagePayload {
  sample_id: string;
  file_path: string;
  validation_status: ValidationStatus;
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

export class GrainImageRepository {

  async create(payload: CreateGrainImagePayload): Promise<GrainImage> {
    const id = generateUUID();

    await db.runAsync(
      `INSERT INTO grain_images (id, sample_id, file_path, validation_status)
       VALUES (?, ?, ?, ?)`,
      [id, payload.sample_id, payload.file_path, payload.validation_status]
    );

    // DEBUG LOG | DELETE AFTERWARDS ---------------------------------
    const inserted = await db.getFirstAsync(
      `SELECT * FROM grain_images WHERE id = ?`,
      [id]
    );
    console.log('✅ GRAIN IMAGE SAVED TO SQLITE:', JSON.stringify(inserted, null, 2));

    return await this.getById(id);
  }

  async getById(id: string): Promise<GrainImage> {
    const row = await db.getFirstAsync<GrainImage>(
      `SELECT * FROM grain_images WHERE id = ?`,
      [id]
    );
    if (!row) throw new Error(`GrainImage ${id} not found`);
    return row;
  }

  async getBySample(sampleId: string): Promise<GrainImage | null> {
    const row = await db.getFirstAsync<GrainImage>(
      `SELECT * FROM grain_images WHERE sample_id = ? ORDER BY uploaded_at DESC LIMIT 1`,
      [sampleId]
    );
    return row ?? null;
  }

  async updateValidationStatus(id: string, status: ValidationStatus): Promise<void> {
    await db.runAsync(
      `UPDATE grain_images SET validation_status = ? WHERE id = ?`,
      [status, id]
    );
  }

  async deleteBySample(sampleId: string): Promise<void> {
    await db.runAsync(`DELETE FROM grain_images WHERE sample_id = ?`, [sampleId]);
  }

  async delete(id: string): Promise<void> {
    await db.runAsync(`DELETE FROM grain_images WHERE id = ?`, [id]);
  }
}