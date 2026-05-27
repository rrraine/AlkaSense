import { getDatabase } from '../../../db/database';
import { uploadReport } from '../../../api/endpoints/reportApi';
import { withExponentialBackoff } from '../../../shared/utils/exponentialBackoff';
import { ExportGenerationResult } from '../../../shared/types/report.types';

export async function initiateUpload(
  sessionId: string,
  report: ExportGenerationResult
): Promise<{ server_id: string; received_at: string }> {
  const db = getDatabase();

  await db.runAsync(
    `UPDATE session_reports
     SET upload_attempts = upload_attempts + 1,
         last_attempted_at = datetime('now')
     WHERE session_id = ?`,
    [sessionId]
  );

  try {
    const receipt = await withExponentialBackoff(
      () => uploadReport({ ...report, session_id: sessionId }),
      { initialDelay: 2000, multiplier: 2, maxDelay: 60000, maxAttempts: 1 }
    );

    await db.runAsync(
      `UPDATE session_reports SET upload_status = 'UPLOADED' WHERE session_id = ?`,
      [sessionId]
    );

    return receipt;
  } catch (err) {
    await db.runAsync(
      `UPDATE session_reports SET upload_status = 'FAILED' WHERE session_id = ?`,
      [sessionId]
    );
    throw err;
  }
}

export async function retryUpload(
  sessionId: string
): Promise<{ server_id: string; received_at: string }> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ pdf_path: string; csv_path: string; generated_at: string }>(
    'SELECT pdf_path, csv_path, generated_at FROM session_reports WHERE session_id = ? ORDER BY rowid DESC LIMIT 1',
    [sessionId]
  );
  if (!row) throw new Error(`No report found for session ${sessionId}`);

  await db.runAsync(
    `UPDATE session_reports SET upload_status = 'NOT_UPLOADED' WHERE session_id = ?`,
    [sessionId]
  );

  return initiateUpload(sessionId, {
    pdf_path: row.pdf_path,
    csv_path: row.csv_path,
    generated_at: row.generated_at,
  });
}
