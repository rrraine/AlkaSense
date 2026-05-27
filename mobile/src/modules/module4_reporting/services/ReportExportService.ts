import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { getDatabase } from '../../../db/database';
import { ExportGenerationResult, SessionReportRecord } from '../../../shared/types/report.types';

export async function closeSession(sessionId: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `UPDATE sessions SET status = 'CLOSED' WHERE id = ?`,
    [sessionId]
  );
}

export async function getReportBySession(sessionId: string): Promise<SessionReportRecord | null> {
  const db = getDatabase();
  return db.getFirstAsync<SessionReportRecord>(
    'SELECT * FROM session_reports WHERE session_id = ? ORDER BY rowid DESC LIMIT 1',
    [sessionId]
  );
}

export async function generateReport(sessionId: string): Promise<ExportGenerationResult> {
  const db = getDatabase();

  const session = await db.getFirstAsync<{
    id: string; name: string; batch_id: string;
    koh_concentration: string; incubation_duration: number;
    incubation_temperature: number; evaluation_date: string; evaluator_id: string;
  }>(
    'SELECT * FROM sessions WHERE id = ?',
    [sessionId]
  );
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const rows = await db.getAllAsync<{
    sample_identifier: string; rice_variety: string; grain_count: number;
    final_asv_score: number; gt_class: string; gt_range: string;
    ai_draft_used: number; deviated_from_draft: number;
    deviation_remark: string | null; confirming_evaluator_id: string; confirmed_at: string;
  }>(
    `SELECT
       s.sample_identifier, s.rice_variety, s.grain_count,
       cs.final_asv_score, cs.gt_class, cs.gt_range,
       cs.ai_draft_used, cs.deviated_from_draft,
       cs.deviation_remark, cs.confirming_evaluator_id, cs.confirmed_at
     FROM samples s
     JOIN evaluation_records er ON er.sample_id = s.id
     JOIN confirmed_scores cs ON cs.evaluation_id = er.id
     WHERE s.session_id = ?
     ORDER BY s.rowid ASC`,
    [sessionId]
  );

  const generatedAt = new Date().toISOString();
  const base = documentDirectory ?? '';
  const dir = `${base}reports/${sessionId}/`;
  await makeDirectoryAsync(dir, { intermediates: true });

  const csvHeader =
    'sample_identifier,rice_variety,grain_count,asv_score,gt_class,gt_range,ai_draft_used,deviated,remark,evaluator_id,confirmed_at\n';
  const csvRows = rows
    .map((r) =>
      [
        r.sample_identifier,
        r.rice_variety,
        r.grain_count,
        r.final_asv_score,
        r.gt_class,
        r.gt_range,
        r.ai_draft_used ? 'true' : 'false',
        r.deviated_from_draft ? 'true' : 'false',
        `"${(r.deviation_remark ?? '').replace(/"/g, '""')}"`,
        r.confirming_evaluator_id,
        r.confirmed_at,
      ].join(',')
    )
    .join('\n');

  const csvPath = `${dir}report.csv`;
  await writeAsStringAsync(csvPath, csvHeader + csvRows, { encoding: 'utf8' });

  const result: ExportGenerationResult = {
    csv_path: csvPath,
    generated_at: generatedAt,
  };

  // pdf_path column is NOT NULL in the DB schema; pass empty string until a migration removes it.
  await db.runAsync(
    `INSERT OR REPLACE INTO session_reports
      (id, session_id, pdf_path, csv_path, generated_at, upload_status, upload_attempts)
     VALUES (?, ?, ?, ?, ?, 'NOT_UPLOADED', 0)`,
    [`report-${sessionId}`, sessionId, '', csvPath, generatedAt]
  );

  return result;
}

export async function shareReport(filePath: string): Promise<void> {
  try {
    const info = await getInfoAsync(filePath);
    if (!info.exists) {
      Alert.alert('File Not Found', 'Report file not found. Please regenerate the report.');
      return;
    }
    const available = await Sharing.isAvailableAsync();
    if (!available) {
      Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
      return;
    }
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: 'Export CSV Report',
      UTI: 'public.comma-separated-values-text',
    });
  } catch (error) {
    console.error('[shareReport] failed:', error);
    Alert.alert('Export Failed', 'Unable to open the report. Please try again.');
  }
}
