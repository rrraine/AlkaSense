import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type UploadStatus = 'NOT_UPLOADED' | 'UPLOADING' | 'UPLOADED' | 'FAILED';

export interface SessionReport {
  id: string;
  session_id: string;
  evaluator_id: string;
  total_samples: number;
  total_classified: number;
  total_rejected: number;
  total_corrections: number;
  asv_distribution: string;
  gt_distribution: string;
  pdf_file_path: string | null;
  csv_file_path: string | null;
  upload_status: UploadStatus;
  upload_attempts: number;
  last_upload_attempt_at: string | null;
  uploaded_at: string | null;
  server_id: string | null;
  generated_at: string;
}

export interface CreateSessionReportPayload {
  session_id: string;
  evaluator_id: string;
  total_samples: number;
  total_classified: number;
  total_rejected: number;
  total_corrections: number;
  asv_distribution: Record<string, number>;
  gt_distribution: Record<string, number>;
  pdf_file_path?: string;
  csv_file_path?: string;
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

export class SessionReportRepository {

  async create(payload: CreateSessionReportPayload): Promise<SessionReport> {
    const id = generateUUID();

    await db.runAsync(
      `INSERT INTO session_reports (
        id, session_id, evaluator_id,
        total_samples, total_classified, total_rejected, total_corrections,
        asv_distribution, gt_distribution,
        pdf_file_path, csv_file_path,
        upload_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NOT_UPLOADED')`,
      [
        id,
        payload.session_id,
        payload.evaluator_id,
        payload.total_samples,
        payload.total_classified,
        payload.total_rejected,
        payload.total_corrections,
        JSON.stringify(payload.asv_distribution),
        JSON.stringify(payload.gt_distribution),
        payload.pdf_file_path ?? null,
        payload.csv_file_path ?? null,
      ]
    );

    return await this.getById(id);
  }

  async getById(id: string): Promise<SessionReport> {
    const row = await db.getFirstAsync<SessionReport>(
      `SELECT * FROM session_reports WHERE id = ?`,
      [id]
    );
    if (!row) throw new Error(`SessionReport ${id} not found`);
    return row;
  }

  async getBySession(sessionId: string): Promise<SessionReport | null> {
    const row = await db.getFirstAsync<SessionReport>(
      `SELECT * FROM session_reports WHERE session_id = ? ORDER BY generated_at DESC LIMIT 1`,
      [sessionId]
    );
    return row ?? null;
  }

  async getPendingUploads(): Promise<SessionReport[]> {
    return await db.getAllAsync<SessionReport>(
      `SELECT * FROM session_reports WHERE upload_status IN ('NOT_UPLOADED', 'FAILED') ORDER BY generated_at ASC`
    );
  }

  async markUploading(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE session_reports
       SET upload_status = 'UPLOADING',
           upload_attempts = upload_attempts + 1,
           last_upload_attempt_at = ?
       WHERE id = ?`,
      [now, id]
    );
  }

  async markUploaded(id: string, serverId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE session_reports
       SET upload_status = 'UPLOADED',
           uploaded_at = ?,
           server_id = ?
       WHERE id = ?`,
      [now, serverId, id]
    );
  }

  async markFailed(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE session_reports
       SET upload_status = 'FAILED'
       WHERE id = ?`,
      [id]
    );
  }

  async updateCsvPath(id: string, csvPath: string): Promise<void> {
    await db.runAsync(
      `UPDATE session_reports SET csv_file_path = ? WHERE id = ?`,
      [csvPath, id]
    );
  }

  async updateFilePaths(id: string, pdfPath?: string, csvPath?: string): Promise<void> {
    await db.runAsync(
      `UPDATE session_reports SET pdf_file_path = ?, csv_file_path = ? WHERE id = ?`,
      [pdfPath ?? null, csvPath ?? null, id]
    );
  }
}
