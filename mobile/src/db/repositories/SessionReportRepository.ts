import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type UploadStatus = 'Generated' | 'Uploaded';

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
  created_at: string;
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
        pdf_file_path, csv_file_path, upload_status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Generated')`,
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

    // DEBUG LOG | DELETE AFTERWARDS ---------------------------------
    const inserted = await db.getFirstAsync(
      `SELECT * FROM session_reports WHERE id = ?`,
      [id]
    );
    console.log('✅ SESSION REPORT SAVED TO SQLITE:', JSON.stringify(inserted, null, 2));

    return await this.getById(id);
  }

  

  async getById(id: string): Promise<SessionReport> {
    const row = await db.getFirstAsync<SessionReport>(
      `SELECT session_reports.*, end_time AS created_at FROM session_reports WHERE id = ?`,
      [id]
    );
    if (!row) throw new Error(`SessionReport ${id} not found`);
    return row;
  }

  async getBySession(sessionId: string): Promise<SessionReport | null> {
    const row = await db.getFirstAsync<SessionReport>(
      `SELECT session_reports.*, end_time AS created_at FROM session_reports WHERE session_id = ? ORDER BY end_time DESC LIMIT 1`,
      [sessionId]
    );
    return row ?? null;
  }

  async markUploaded(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE session_reports SET upload_status = 'Uploaded' WHERE id = ?`,
      [id]
    );
  }

  async updateFilePaths(id: string, pdfPath?: string, csvPath?: string): Promise<void> {
    await db.runAsync(
      `UPDATE session_reports SET pdf_file_path = ?, csv_file_path = ? WHERE id = ?`,
      [pdfPath ?? null, csvPath ?? null, id]
    );
  }
}