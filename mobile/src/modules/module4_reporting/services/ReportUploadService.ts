import { getDatabase } from '../../../db/database';
import { uploadReport } from '../../../api/endpoints/reportApi';
import { withExponentialBackoff } from '../../../shared/utils/exponentialBackoff';
import { ExportGenerationResult } from '../../../shared/types/report.types';

export async function initiateUpload(
  sessionId: string,
  report: ExportGenerationResult
): Promise<{ server_id: string; received_at: string }> {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE session_reports
     SET upload_status = 'NOT_UPLOADED',
         upload_attempts = upload_attempts + 1,
         last_attempted_at = datetime('now')
     WHERE session_id = ?`,
    [sessionId]
  );

  try {
    const receipt = await withExponentialBackoff(
      () => uploadReport({ ...report, session_id: sessionId }),
      { initialDelay: 2000, multiplier: 2, maxDelay: 60000, maxAttempts: 5 }
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
