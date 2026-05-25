import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SampleStatus =
  | 'Pending'
  | 'Image Submitted'
  | 'Confirmed';

export type RiceVariety =
  | 'NSIC Rc 222'
  | 'NSIC Rc 160'
  | 'PSB Rc 18'
  | 'PSB Rc 82'
  | 'IR64'
  | 'IR72';

export type GTClass =
  | 'Null'
  | 'Low GT'
  | 'Intermediate GT'
  | 'High GT';

export interface Sample {
  id: string;

  session_id: string;

  sample_identifier: string;

  grain_count: number;

  rice_variety: RiceVariety;

  status: SampleStatus;

  asv_score: number;

  gt_class: GTClass;

  created_at: string;
}

export interface CreateSamplePayload {
  session_id: string;

  sample_identifier: string;

  grain_count: number;

  rice_variety: RiceVariety;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, (c) => {

      const r = (Math.random() * 16) | 0;

      const v =
        c === 'x'
          ? r
          : (r & 0x3) | 0x8;

      return v.toString(16);
    });
}

// ─────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────

export class SampleRepository {

  // ───────────────────────────────────────────────────────────
  // Create Sample
  // ───────────────────────────────────────────────────────────

  async create(
    payload: CreateSamplePayload
  ): Promise<Sample> {

    const id = generateUUID();

    await db.runAsync(
      `
      INSERT INTO samples (
        id,
        session_id,
        sample_identifier,
        grain_count,
        rice_variety
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        id,
        payload.session_id,
        payload.sample_identifier.trim(),
        payload.grain_count,
        payload.rice_variety,
      ]
    );

    return await this.getById(id);
  }

  // ───────────────────────────────────────────────────────────
  // Get By ID
  // ───────────────────────────────────────────────────────────

  async getById(id: string): Promise<Sample> {

    const row =
      await db.getFirstAsync<Sample>(
        `
        SELECT *
        FROM samples
        WHERE id = ?
        `,
        [id]
      );

    if (!row) {
      throw new Error(
        `Sample ${id} not found`
      );
    }

    return row;
  }

  // ───────────────────────────────────────────────────────────
  // Get By Session
  // ───────────────────────────────────────────────────────────

  async getBySession(
    sessionId: string
  ): Promise<Sample[]> {

    return await db.getAllAsync<Sample>(
      `
      SELECT *
      FROM samples
      WHERE session_id = ?
      ORDER BY created_at ASC
      `,
      [sessionId]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Get By Status
  // ───────────────────────────────────────────────────────────

  async getByStatus(
    sessionId: string,
    status: SampleStatus
  ): Promise<Sample[]> {

    return await db.getAllAsync<Sample>(
      `
      SELECT *
      FROM samples
      WHERE
        session_id = ?
        AND status = ?
      ORDER BY created_at ASC
      `,
      [sessionId, status]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Identifier Exists
  // ───────────────────────────────────────────────────────────

  async identifierExists(
    sampleIdentifier: string,
    sessionId: string,
    excludeId?: string
  ): Promise<boolean> {

    const row =
      await db.getFirstAsync<{ count: number }>(
        `
        SELECT COUNT(*) as count
        FROM samples
        WHERE
          LOWER(sample_identifier) =
          LOWER(?)
          AND session_id = ?
          ${excludeId ? 'AND id != ?' : ''}
        `,
        excludeId
          ? [
              sampleIdentifier.trim(),
              sessionId,
              excludeId,
            ]
          : [
              sampleIdentifier.trim(),
              sessionId,
            ]
      );

    return (row?.count ?? 0) > 0;
  }

  // ───────────────────────────────────────────────────────────
  // Update Status
  // ───────────────────────────────────────────────────────────

  async updateStatus(
    id: string,
    status: SampleStatus
  ): Promise<void> {

    await db.runAsync(
      `
      UPDATE samples
      SET status = ?
      WHERE id = ?
      `,
      [status, id]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Update Score
  // ───────────────────────────────────────────────────────────

  async updateScore(
    id: string,
    asvScore: number,
    gtClass: GTClass
  ): Promise<void> {

    await db.runAsync(
      `
      UPDATE samples
      SET
        asv_score = ?,
        gt_class = ?,
        status = 'Confirmed'
      WHERE id = ?
      `,
      [
        asvScore,
        gtClass,
        id,
      ]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Count By Session
  // ───────────────────────────────────────────────────────────

  async getCountBySession(
    sessionId: string
  ): Promise<number> {

    const row =
      await db.getFirstAsync<{ count: number }>(
        `
        SELECT COUNT(*) as count
        FROM samples
        WHERE session_id = ?
        `,
        [sessionId]
      );

    return row?.count ?? 0;
  }

  // ───────────────────────────────────────────────────────────
  // Attach Image
  // ───────────────────────────────────────────────────────────

  async attachImage(
    sampleId: string,
    imagePath: string,
    validationStatus: string
  ): Promise<string> {

    const imageId = generateUUID();

    await db.runAsync(
      `
      INSERT INTO grain_images (
        id,
        sample_id,
        file_path,
        validation_status
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        imageId,
        sampleId,
        imagePath,
        validationStatus,
      ]
    );

    return imageId;
  }

  // ───────────────────────────────────────────────────────────
  // Get Image
  // ───────────────────────────────────────────────────────────

  async getImage(sampleId: string) {

    return await db.getFirstAsync(
      `
      SELECT *
      FROM grain_images
      WHERE sample_id = ?
      `,
      [sampleId]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Delete Sample
  // ───────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {

    await db.runAsync(
      `
      DELETE FROM samples
      WHERE id = ?
      `,
      [id]
    );
  }
}