import { auth } from '../core/firebase';
import { apiFetch } from '../core/api/client';
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

  // ASV distribution
  const asvDistribution: Record<string, number> = {};
  const gtDistribution: Record<string, number> = {};

  for (const sample of allSamples) {
    const score = String(sample.asv_score ?? 0);
    asvDistribution[score] = (asvDistribution[score] ?? 0) + 1;
    const gt = sample.gt_class ?? 'Null';
    gtDistribution[gt] = (gtDistribution[gt] ?? 0) + 1;
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

  // Build confirmed-evaluation fallback map (for legacy rows where sample
  // score/gt might not have been mirrored yet).
  const confirmedBySample = new Map<string, { asv: number; gt: string | null }>();
  for (const ev of confirmedEvals) {
    if (!ev?.sample_id) continue;
    confirmedBySample.set(ev.sample_id, {
      asv: Number(ev.final_asv_score ?? ev.predicted_asv_score ?? 0),
      gt: (ev.final_gt_class ?? ev.predicted_gt_class ?? null) as string | null,
    });
  }

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
  const gtCounts = { 'Low GT': 0, 'Intermediate GT': 0, 'High GT': 0 };
  let totalForPie = 0;
  for (const sample of samples) {
    const fallback = confirmedBySample.get(sample.id);
    const normalized = normalizeGTClass(
      sample.gt_class && sample.gt_class !== 'Null' ? sample.gt_class : fallback?.gt
    );

    if (normalized !== 'Null') {
      gtCounts[normalized]++;
      totalForPie++;
    }
  }

  const gtDistributionPct = Object.fromEntries(
    Object.entries(gtCounts).map(([k, v]) => [
      k,
      totalForPie > 0 ? Math.round((v / totalForPie) * 100) : 0,
    ])
  );

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