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

const reportRepo = new SessionReportRepository();
const sessionRepo = new SessionRepository();
const sampleRepo = new SampleRepository();
const correctionRepo = new CorrectionLogRepository();
const evaluationRepo = new EvaluationRepository();

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

/**
 * Generates and persists a session report to SQLite.
 * Business rules:
 * - Cannot generate if session is still Active
 * - All samples must be Confirmed before generating
 */
export async function generateReport(sessionId: string): Promise<SessionReport> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');

  // Business rule: session must be Completed
  const session = await sessionRepo.getById(sessionId);
  if (session.status === 'Active') {
    throw new Error('Cannot generate report for an Active session. Complete the session first.');
  }

  // Business rule: all samples must be Confirmed
  const allSamples = await sampleRepo.getBySession(sessionId);
  const unconfirmed = allSamples.filter((s) => s.status !== 'Confirmed');
  if (unconfirmed.length > 0) {
    throw new Error(
      `${unconfirmed.length} sample(s) are not yet Confirmed. Confirm all samples before generating a report.`
    );
  }

  // Check if report already exists
  const existing = await reportRepo.getBySession(sessionId);
  if (existing) return existing;

  // Compute statistics
  const total = allSamples.length;
  const confirmed = allSamples.filter((s) => s.status === 'Confirmed').length;
  const rejected = 0; // samples with quality failure images — extend when needed
  const totalCorrections = await correctionRepo.countBySession(sessionId);
  const confirmedEvals = await evaluationRepo.getConfirmedEvaluations(sessionId);
  const confirmedBySample = buildConfirmedBySampleMap(confirmedEvals);

  // ASV distribution
  const asvDistribution: Record<string, number> = {};
  const gtDistribution: Record<string, number> = {};

  for (const sample of allSamples) {
    const fallback = confirmedBySample.get(sample.id);
    const score = String(
      sample.asv_score >= 1 && sample.asv_score <= 7
        ? sample.asv_score
        : (fallback?.asv ?? 0)
    );
    asvDistribution[score] = (asvDistribution[score] ?? 0) + 1;

    const normalized = normalizeGTClass(
      sample.gt_class && sample.gt_class !== 'Null' ? sample.gt_class : fallback?.gt
    );

    if (normalized !== 'Null') {
      gtDistribution[normalized] = (gtDistribution[normalized] ?? 0) + 1;
    }
  }

  return await reportRepo.create({
    session_id: sessionId,
    evaluator_id: firebaseUser.uid,
    total_samples: total,
    total_classified: confirmed,
    total_rejected: rejected,
    total_corrections: totalCorrections,
    asv_distribution: asvDistribution,
    gt_distribution: gtDistribution,
  });
}

/**
 * Uploads the report to backend.
 * Business rules:
 * - Can only upload once (upload_status must be 'Generated')
 * - Session must be Completed
 */
export async function uploadReport(sessionId: string): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');

  const report = await reportRepo.getBySession(sessionId);
  if (!report) throw new Error('No report found. Generate a report first.');
  if (report.upload_status === 'Uploaded') {
    throw new Error('Report has already been uploaded.');
  }

  const session = await sessionRepo.getById(sessionId);
  if (session.status === 'Active') {
    throw new Error('Cannot upload report for an Active session.');
  }

  const token = await firebaseUser.getIdToken();

  // Upload to backend
  await apiFetch('/reports/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      session_id: sessionId,
      report_id: report.id,
      total_samples: report.total_samples,
      total_classified: report.total_classified,
      total_corrections: report.total_corrections,
      asv_distribution: JSON.parse(report.asv_distribution),
      gt_distribution: JSON.parse(report.gt_distribution),
    },
  });

  // Mark as uploaded in SQLite
  await reportRepo.markUploaded(report.id);
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

  // Build ASV distribution for chart
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

  // GT distribution for pie chart
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

  const hasLiveGtData = Object.values(liveGtCounts).some((value) => value > 0);
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

export async function exportSessionSummaryCsv(sessionId: string): Promise<{ fileUri: string; fileName: string }> {
  const report = await reportRepo.getBySession(sessionId) ?? await generateReport(sessionId);
  const summary = await getSessionSummaryData(sessionId);

  const fileName = `alkasense-session-${sessionId}-summary.csv`;
  const directory = `${FileSystem.documentDirectory ?? ''}alkasense-reports/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const csvRows: Array<Array<string | number | boolean | null | undefined>> = [
    ['section', 'item', 'value', 'details'],
    ['report', 'session_id', summary.session.id, summary.session.name],
    ['report', 'generated_at', report.created_at, report.upload_status],
    ['stats', 'total', summary.stats.total, ''],
    ['stats', 'classified', summary.stats.classified, ''],
    ['stats', 'rejected', summary.stats.rejected, ''],
    ['stats', 'corrections', summary.stats.corrections, ''],
    ['', '', '', ''],
    ['asv_distribution', '1', summary.asvDistribution[0], ''],
    ['asv_distribution', '2', summary.asvDistribution[1], ''],
    ['asv_distribution', '3', summary.asvDistribution[2], ''],
    ['asv_distribution', '4', summary.asvDistribution[3], ''],
    ['asv_distribution', '5', summary.asvDistribution[4], ''],
    ['asv_distribution', '6', summary.asvDistribution[5], ''],
    ['asv_distribution', '7', summary.asvDistribution[6], ''],
    ['', '', '', ''],
    ['gt_distribution_pct', 'Low GT', summary.gtDistributionPct['Low GT'] ?? 0, ''],
    ['gt_distribution_pct', 'Intermediate GT', summary.gtDistributionPct['Intermediate GT'] ?? 0, ''],
    ['gt_distribution_pct', 'High GT', summary.gtDistributionPct['High GT'] ?? 0, ''],
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
  const fileUri = `${directory}${fileName}`;
  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Batch Summary CSV',
      UTI: 'public.comma-separated-values-text',
    });
  }

  return { fileUri, fileName };
}