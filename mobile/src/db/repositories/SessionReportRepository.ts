import db from '../database';
import { SessionReportRecord, UploadStatus } from '../../shared/types/report.types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type SessionReportInput = {
  session_id: string;
  pdf_path?: string;
  csv_path: string;
  generated_at: string;
};

export class SessionReportRepository {

  async create(input: SessionReportInput): Promise<SessionReportRecord> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO session_reports
         (id, session_id, pdf_path, csv_path, generated_at, upload_status, upload_attempts)
       VALUES (?, ?, ?, ?, ?, 'NOT_UPLOADED', 0)`,
      [id, input.session_id, input.pdf_path ?? '', input.csv_path, input.generated_at]
    );
    return this.getById(id);
  }

  async getById(id: string): Promise<SessionReportRecord> {
    const row = await db.getFirstAsync<SessionReportRecord>(
      `SELECT * FROM session_reports WHERE id = ?`, [id]
    );
    if (!row) throw new Error(`SessionReport ${id} not found`);
    return row;
  }

  async getBySession(sessionId: string): Promise<SessionReportRecord[]> {
    return await db.getAllAsync<SessionReportRecord>(
      `SELECT * FROM session_reports WHERE session_id = ? ORDER BY generated_at DESC`,
      [sessionId]
    );
  }

  async getPendingUploads(): Promise<SessionReportRecord[]> {
    return await db.getAllAsync<SessionReportRecord>(
      `SELECT * FROM session_reports WHERE upload_status != 'UPLOADED' ORDER BY generated_at ASC`
    );
  }

  async recordUploadAttempt(id: string, status: UploadStatus): Promise<void> {
    await db.runAsync(
      `UPDATE session_reports
       SET upload_status = ?, upload_attempts = upload_attempts + 1, last_attempted_at = datetime('now')
       WHERE id = ?`,
      [status, id]
    );
  }
}
