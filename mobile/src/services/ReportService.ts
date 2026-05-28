import { auth } from '../core/firebase';
import { apiFetch } from '../core/api/client';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  SessionReportRepository,
  SessionReport,
} from '../db/repositories/SessionReportRepository';
import { SessionRepository } from '../db/repositories/SessionRepository';
import { SampleRepository } from '../db/repositories/SampleRepository';
import { CorrectionLogRepository } from '../db/repositories/CorrectionLogRepository';
import { EvaluationRepository } from '../db/repositories/EvaluationRepository';
import { completeSession } from './SessionService';

const reportRepo = new SessionReportRepository();
const sessionRepo = new SessionRepository();
const sampleRepo = new SampleRepository();
const correctionRepo = new CorrectionLogRepository();
const evaluationRepo = new EvaluationRepository();

// Exponential backoff ceiling from SDD §2: 2s initial, doubles to 60s max.
const BACKOFF_INITIAL_MS = 2_000;
const BACKOFF_CEILING_MS = 60_000;

function backoffDelayMs(attempt: number): number {
  const delay = BACKOFF_INITIAL_MS * Math.pow(2, attempt);
  return Math.min(delay, BACKOFF_CEILING_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeGTClass(gt: string | null | undefined): 'Low GT' | 'Intermediate GT' | 'High GT' | 'Null' {
  if (!gt) return 'Null';
  const v = gt.toLowerCase();
  if (v.includes('high gt')) return 'High GT';
  if (v.includes('intermediate gt')) return 'Intermediate GT';
  if (v.includes('low gt')) return 'Low GT';
  return 'Null';
}

function buildConfirmedBySampleMap(confirmedEvals: Awaited<ReturnType<typeof evaluationRepo.getConfirmedEvaluations>>) {
  const confirmedBySample = new Map<string, { asv: number; gt: string | null }>();
  for (const ev of confirmedEvals) {
    if (!ev?.sample_id) continue;
    confirmedBySample.set(ev.sample_id, {
      asv: Number(ev.final_asv_score ?? ev.predicted_asv_score ?? 0),
      gt: (ev.final_gt_class ?? ev.predicted_gt_class ?? null) as string | null,
    });
  }
  return confirmedBySample;
}

function distributionCountsToPct(counts: Record<string, number>): Record<string, number> {
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [
      key,
      total > 0 ? Math.round((value / total) * 100) : 0,
    ])
  );
}

function escapeCsvValue(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

function reportDirectory(): string {
  return `${FileSystem.documentDirectory ?? ''}alkasense-reports/`;
}

// ─── CSV file generation ──────────────────────────────────────

async function buildCsvForSession(
  sessionId: string,
  samples: Awaited<ReturnType<typeof sampleRepo.getBySession>>,
  confirmedBySample: ReturnType<typeof buildConfirmedBySampleMap>,
  asvDistribution: number[],
  gtDistributionPct: Record<string, number>,
  stats: { total: number; classified: number; rejected: number; corrections: number },
  session: Awaited<ReturnType<typeof sessionRepo.getById>>,
): Promise<string> {
  const dir = reportDirectory();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

  const fileName = `alkasense-${sessionId}-report.csv`;
  const fileUri = `${dir}${fileName}`;

  const csvRows: Array<Array<string | number | boolean | null | undefined>> = [
    ['section', 'item', 'value', 'details'],
    ['report', 'session_id', session.id, session.name],
    ['report', 'batch_identifier', session.batch_identifier, ''],
    ['report', 'koh_concentration', session.koh_concentration, '%'],
    ['report', 'incubation_duration', session.incubation_duration, 'h'],
    ['report', 'incubation_temp', session.incubation_temp, '°C'],
    ['report', 'generated_at', new Date().toISOString(), ''],
    ['', '', '', ''],
    ['stats', 'total_samples', stats.total, ''],
    ['stats', 'classified', stats.classified, ''],
    ['stats', 'rejected', stats.rejected, ''],
    ['stats', 'corrections', stats.corrections, ''],
    ['', '', '', ''],
    ['asv_distribution', 'ASV 1', asvDistribution[0], ''],
    ['asv_distribution', 'ASV 2', asvDistribution[1], ''],
    ['asv_distribution', 'ASV 3', asvDistribution[2], ''],
    ['asv_distribution', 'ASV 4', asvDistribution[3], ''],
    ['asv_distribution', 'ASV 5', asvDistribution[4], ''],
    ['asv_distribution', 'ASV 6', asvDistribution[5], ''],
    ['asv_distribution', 'ASV 7', asvDistribution[6], ''],
    ['', '', '', ''],
    ['gt_distribution_pct', 'Low GT', gtDistributionPct['Low GT'] ?? 0, '%'],
    ['gt_distribution_pct', 'Intermediate GT', gtDistributionPct['Intermediate GT'] ?? 0, '%'],
    ['gt_distribution_pct', 'High GT', gtDistributionPct['High GT'] ?? 0, '%'],
    ['', '', '', ''],
    ['sample', 'sample_identifier', 'asv_score', 'gt_class'],
    ...samples.map((sample) => {
      const fallback = confirmedBySample.get(sample.id);
      const asv = sample.asv_score >= 1 && sample.asv_score <= 7
        ? sample.asv_score
        : (fallback?.asv ?? 0);
      const gt = sample.gt_class && sample.gt_class !== 'Null'
        ? sample.gt_class
        : normalizeGTClass(fallback?.gt);
      return ['sample', sample.sample_identifier, asv, gt];
    }),
  ];

  const csvContent = toCsv(csvRows);
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return fileUri;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Generates the session report record and CSV file locally.
 * - Cannot generate if session is Active.
 * - All samples must be Confirmed.
 * - Returns existing report if already generated.
 */
export async function generateReport(sessionId: string): Promise<SessionReport> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');

  // Per SDD §4.2: "Generate Report" formally closes the active session and
  // triggers report generation. All samples must be Confirmed first.
  const allSamples = await sampleRepo.getBySession(sessionId);
  const unconfirmed = allSamples.filter((s) => s.status !== 'Confirmed');
  if (unconfirmed.length > 0) {
    throw new Error(
      `${unconfirmed.length} sample(s) are not yet Confirmed. Confirm all samples before generating a report.`
    );
  }

  const session = await sessionRepo.getById(sessionId);
  if (session.status === 'Active') {
    // Close the session atomically with report generation.
    await completeSession(sessionId);
  }

  // Return existing report if present
  const existing = await reportRepo.getBySession(sessionId);
  if (existing) return existing;

  const totalCorrections = await correctionRepo.countBySession(sessionId);
  const confirmedEvals = await evaluationRepo.getConfirmedEvaluations(sessionId);
  const confirmedBySample = buildConfirmedBySampleMap(confirmedEvals);

  const asvDistCounts: Record<string, number> = {};
  const gtDistCounts: Record<string, number> = {};
  const asvChartData = Array(7).fill(0);

  for (const sample of allSamples) {
    const fallback = confirmedBySample.get(sample.id);
    const score = sample.asv_score >= 1 && sample.asv_score <= 7
      ? sample.asv_score
      : (fallback?.asv ?? 0);

    const scoreKey = String(score);
    asvDistCounts[scoreKey] = (asvDistCounts[scoreKey] ?? 0) + 1;
    if (score >= 1 && score <= 7) asvChartData[score - 1]++;

    const normalized = normalizeGTClass(
      sample.gt_class && sample.gt_class !== 'Null' ? sample.gt_class : fallback?.gt
    );
    if (normalized !== 'Null') {
      gtDistCounts[normalized] = (gtDistCounts[normalized] ?? 0) + 1;
    }
  }

  const stats = {
    total: allSamples.length,
    classified: allSamples.filter((s) => s.status === 'Confirmed').length,
    rejected: 0,
    corrections: totalCorrections,
  };

  const gtDistributionPct = distributionCountsToPct(gtDistCounts);

  // Write CSV locally
  let csvFilePath: string | undefined;
  try {
    csvFilePath = await buildCsvForSession(
      sessionId, allSamples, confirmedBySample,
      asvChartData, gtDistributionPct, stats, session,
    );
  } catch (csvErr) {
    console.warn('[ReportService] CSV generation failed:', csvErr);
  }

  return await reportRepo.create({
    session_id: sessionId,
    evaluator_id: firebaseUser.uid,
    total_samples: stats.total,
    total_classified: stats.classified,
    total_rejected: stats.rejected,
    total_corrections: stats.corrections,
    asv_distribution: asvDistCounts,
    gt_distribution: gtDistCounts,
    csv_file_path: csvFilePath,
  });
}

/**
 * Uploads the report to the backend.
 * - Sets status to UPLOADING before the network call.
 * - On success: UPLOADED + stores server_id.
 * - On failure: FAILED, increments upload_attempts.
 * - Network failure never interrupts local completion.
 */
export async function uploadReport(sessionId: string): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');

  let report = await reportRepo.getBySession(sessionId);
  if (!report) {
    report = await generateReport(sessionId);
  }

  // Per SDD §4.3: upload is gated only on a locally generated,
  // not-yet-uploaded SessionReportRecord — session status is not a prerequisite.
  if (report.upload_status === 'UPLOADED') {
    throw new Error('Report has already been uploaded.');
  }

  await reportRepo.markUploading(report.id);

  try {
    const token = await firebaseUser.getIdToken();

    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('report_id', report.id);
    formData.append('total_samples', String(report.total_samples));
    formData.append('total_classified', String(report.total_classified));
    formData.append('total_corrections', String(report.total_corrections));
    formData.append('asv_distribution', report.asv_distribution);
    formData.append('gt_distribution', report.gt_distribution);

    if (report.csv_file_path) {
      const fileInfo = await FileSystem.getInfoAsync(report.csv_file_path);
      if (fileInfo.exists) {
        formData.append('csv_file', {
          uri: report.csv_file_path,
          name: `report-${report.id}.csv`,
          type: 'text/csv',
        } as any);
        console.log('[ReportService] Attaching CSV:', report.csv_file_path);
      } else {
        console.warn('[ReportService] CSV path recorded but file not found:', report.csv_file_path);
      }
    } else {
      console.log('[ReportService] No CSV file; uploading metadata only.');
    }

    const responseData = await apiFetch('/reports/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const serverId: string = responseData?.id ?? responseData?.server_id ?? report.id;
    await reportRepo.markUploaded(report.id, serverId);
    console.log('[ReportService] Report uploaded successfully:', serverId);
  } catch (err: any) {
    await reportRepo.markFailed(report.id);
    console.error('[ReportService] Upload failed —', err?.message ?? err);
    throw err;
  }
}

/**
 * Retries all FAILED or NOT_UPLOADED reports with exponential backoff.
 * Non-blocking: catches per-report errors and continues.
 * Intended to be called from a background sync trigger.
 */
export async function retryFailedUploads(): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return;

  const pending = await reportRepo.getPendingUploads();
  if (pending.length === 0) return;

  console.log(`[ReportService] Retrying ${pending.length} pending upload(s).`);

  for (const report of pending) {
    const delay = backoffDelayMs(report.upload_attempts);
    await sleep(delay);

    try {
      await uploadReport(report.session_id);
    } catch (err) {
      console.warn(`[ReportService] Retry failed for report ${report.id}:`, err);
    }
  }
}

export async function getReportForSession(sessionId: string): Promise<SessionReport | null> {
  return await reportRepo.getBySession(sessionId);
}

export async function getSessionSummaryData(sessionId: string) {
  const session = await sessionRepo.getById(sessionId);
  const samples = await sampleRepo.getBySession(sessionId);
  const corrections = await correctionRepo.getBySession(sessionId);
  const confirmedEvals = await evaluationRepo.getConfirmedEvaluations(sessionId);
  const report = await reportRepo.getBySession(sessionId);

  const confirmedBySample = buildConfirmedBySampleMap(confirmedEvals);

  const asvDistribution = Array(7).fill(0);
  for (const sample of samples) {
    const fallback = confirmedBySample.get(sample.id);
    const score = sample.asv_score >= 1 && sample.asv_score <= 7
      ? sample.asv_score
      : (fallback?.asv ?? 0);
    if (score >= 1 && score <= 7) {
      asvDistribution[score - 1]++;
    }
  }

  const liveGtCounts = { 'Low GT': 0, 'Intermediate GT': 0, 'High GT': 0 };
  for (const sample of samples) {
    const fallback = confirmedBySample.get(sample.id);
    const normalized = normalizeGTClass(
      sample.gt_class && sample.gt_class !== 'Null' ? sample.gt_class : fallback?.gt
    );
    if (normalized !== 'Null') {
      liveGtCounts[normalized]++;
    }
  }

  const persistedGt = report?.gt_distribution
    ? JSON.parse(report.gt_distribution) as Record<string, number>
    : null;

  const hasLiveGtData = Object.values(liveGtCounts).some((v) => v > 0);
  const gtCounts = hasLiveGtData ? liveGtCounts : (persistedGt ?? liveGtCounts);
  const gtDistributionPct = distributionCountsToPct(gtCounts);

  return {
    session,
    samples,
    corrections,
    confirmedEvals,
    stats: {
      total: samples.length,
      classified: samples.filter((s) => s.status === 'Confirmed').length,
      rejected: 0,
      corrections: corrections.length,
    },
    asvDistribution,
    gtDistributionPct,
  };
}

/**
 * Generates the CSV, shares via expo-sharing, and returns the file URI.
 * Generates the report record first if not yet created.
 */
export async function exportSessionSummaryCsv(
  sessionId: string,
): Promise<{ fileUri: string; fileName: string }> {
  const report = await reportRepo.getBySession(sessionId) ?? await generateReport(sessionId);
  const summary = await getSessionSummaryData(sessionId);

  const fileName = `alkasense-${sessionId}-report.csv`;
  const dir = reportDirectory();
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const fileUri = `${dir}${fileName}`;

  const csvRows: Array<Array<string | number | boolean | null | undefined>> = [
    ['section', 'item', 'value', 'details'],
    ['report', 'session_id', summary.session.id, summary.session.name],
    ['report', 'generated_at', report.generated_at, report.upload_status],
    ['stats', 'total', summary.stats.total, ''],
    ['stats', 'classified', summary.stats.classified, ''],
    ['stats', 'rejected', summary.stats.rejected, ''],
    ['stats', 'corrections', summary.stats.corrections, ''],
    ['', '', '', ''],
    ['asv_distribution', 'ASV 1', summary.asvDistribution[0], ''],
    ['asv_distribution', 'ASV 2', summary.asvDistribution[1], ''],
    ['asv_distribution', 'ASV 3', summary.asvDistribution[2], ''],
    ['asv_distribution', 'ASV 4', summary.asvDistribution[3], ''],
    ['asv_distribution', 'ASV 5', summary.asvDistribution[4], ''],
    ['asv_distribution', 'ASV 6', summary.asvDistribution[5], ''],
    ['asv_distribution', 'ASV 7', summary.asvDistribution[6], ''],
    ['', '', '', ''],
    ['gt_distribution_pct', 'Low GT', summary.gtDistributionPct['Low GT'] ?? 0, '%'],
    ['gt_distribution_pct', 'Intermediate GT', summary.gtDistributionPct['Intermediate GT'] ?? 0, '%'],
    ['gt_distribution_pct', 'High GT', summary.gtDistributionPct['High GT'] ?? 0, '%'],
    ['', '', '', ''],
    ['sample', 'sample_identifier', 'asv_score', 'gt_class'],
    ...summary.samples.map((sample) => [
      'sample',
      sample.sample_identifier,
      sample.asv_score,
      sample.gt_class,
    ]),
  ];

  const csvContent = toCsv(csvRows);
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Persist path if different from stored
  if (report.csv_file_path !== fileUri) {
    await reportRepo.updateCsvPath(report.id, fileUri);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    console.warn('[ReportService] Sharing not available on this device.');
    return { fileUri, fileName };
  }

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Batch Summary CSV',
    UTI: 'public.comma-separated-values-text',
  });

  return { fileUri, fileName };
}
