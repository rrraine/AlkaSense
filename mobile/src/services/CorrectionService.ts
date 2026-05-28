import { auth } from '../core/firebase';
import { apiFetch } from '../core/api/client';
import { getUserById } from '../db/repositories/UserRepository';
import {
  CorrectionLogRepository,
  CorrectionLog,
} from '../db/repositories/CorrectionLogRepository';
import { SampleRepository } from '../db/repositories/SampleRepository';
import { SessionRepository } from '../db/repositories/SessionRepository';
import { EvaluationRepository } from '../db/repositories/EvaluationRepository';
import { AuditLogRepository } from '../db/repositories/AuditLogRepository';

const correctionLogRepo = new CorrectionLogRepository();
const sampleRepo = new SampleRepository();
const sessionRepo = new SessionRepository();
const evaluationRepo = new EvaluationRepository();
const auditLogRepo = new AuditLogRepository();

const CORRECTION_ALLOWED_ROLES = ['Administrator', 'Researcher'];

// Exponential backoff: 2s initial, doubles to 60s ceiling.
const BACKOFF_INITIAL_MS = 2_000;
const BACKOFF_CEILING_MS = 60_000;

function backoffDelayMs(attempt: number): number {
  return Math.min(BACKOFF_INITIAL_MS * Math.pow(2, attempt), BACKOFF_CEILING_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface SubmitCorrectionPayload {
  sessionId: string;
  sampleId: string;
  originalAsvScore: number;
  correctedAsvScore: number;
  correctionRemark: string;
  confirmedScoreId?: string;
  deviationRemark?: string;
}

/**
 * Submits a score correction.
 * Business rules enforced:
 * - Only Administrator or Researcher may submit.
 * - correctedAsvScore must differ from originalAsvScore.
 * - correctionRemark is required.
 * - ASV must be in 1–7 range.
 *
 * Local save always completes first. Backend sync is non-blocking;
 * failures are tracked via sync_attempts for deferred retry.
 */
export async function submitCorrection(
  payload: SubmitCorrectionPayload
): Promise<CorrectionLog> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');

  const user = await getUserById(firebaseUser.uid);
  if (!user) throw new Error('User not found');
  if (!CORRECTION_ALLOWED_ROLES.includes(user.role)) {
    throw new Error('Access denied: only Administrator or Researcher can submit corrections');
  }

  if (payload.correctedAsvScore === payload.originalAsvScore) {
    throw new Error('Corrected score must differ from original score');
  }
  if (!payload.correctionRemark.trim()) {
    throw new Error('Correction remark is required');
  }
  if (payload.correctedAsvScore < 1 || payload.correctedAsvScore > 7) {
    throw new Error('Corrected ASV score must be between 1 and 7');
  }

  // Persist correction locally first — never blocked by network.
  const correctionLog = await correctionLogRepo.create({
    session_id: payload.sessionId,
    sample_id: payload.sampleId,
    evaluator_id: firebaseUser.uid,
    original_asv_score: payload.originalAsvScore,
    corrected_asv_score: payload.correctedAsvScore,
    correction_remark: payload.correctionRemark.trim(),
    confirmed_score_id: payload.confirmedScoreId,
    deviation_remark: payload.deviationRemark?.trim(),
  });

  // Update evaluation record if one exists.
  const evaluation = await evaluationRepo.getBySample(payload.sampleId);
  if (evaluation) {
    await evaluationRepo.confirmEvaluation({
      evaluationId: evaluation.id,
      final_asv_score: payload.correctedAsvScore,
      final_gt_class: evaluation.final_gt_class ?? 'Intermediate GT',
      correction_remark: payload.correctionRemark.trim(),
    });
  }

  await auditLogRepo.create({
    user_id: firebaseUser.uid,
    action: 'SCORE_CORRECTION',
    entity: `sample:${payload.sampleId}`,
  });

  // Deferred backend sync — fire-and-forget; failures tracked for retry.
  _syncCorrectionToBackend(correctionLog.id, firebaseUser).catch((err) => {
    console.warn('[CorrectionService] Deferred sync failed, will retry later:', err);
  });

  return correctionLog;
}

async function _syncCorrectionToBackend(
  correctionId: string,
  firebaseUser: NonNullable<typeof auth.currentUser>,
): Promise<void> {
  const correction = await correctionLogRepo.getById(correctionId);
  await correctionLogRepo.incrementSyncAttempts(correctionId);

  const token = await firebaseUser.getIdToken();
  await apiFetch('/corrections', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: {
      correction_id: correction.id,
      session_id: correction.session_id,
      sample_id: correction.sample_id,
      original_asv_score: correction.original_asv_score,
      corrected_asv_score: correction.corrected_asv_score,
      correction_remark: correction.correction_remark,
      confirmed_score_id: correction.confirmed_score_id ?? null,
      deviation_remark: correction.deviation_remark ?? null,
    },
  });

  await correctionLogRepo.markSynced(correctionId);
  console.log('[CorrectionService] Correction synced to backend:', correctionId);
}

/**
 * Retries all unsynced corrections with exponential backoff per record.
 * Non-blocking per correction — continues on individual failures.
 * Intended to be called from a background sync trigger.
 */
export async function syncPendingCorrections(): Promise<void> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return;

  const unsynced = await correctionLogRepo.getUnsynced();
  if (unsynced.length === 0) return;

  console.log(`[CorrectionService] Syncing ${unsynced.length} pending correction(s).`);

  for (const correction of unsynced) {
    const delay = backoffDelayMs(correction.sync_attempts);
    await sleep(delay);

    try {
      await _syncCorrectionToBackend(correction.id, firebaseUser);
    } catch (err) {
      console.warn(`[CorrectionService] Retry failed for correction ${correction.id}:`, err);
    }
  }
}

export async function getCorrectionsForSession(sessionId: string): Promise<CorrectionLog[]> {
  return await correctionLogRepo.getBySession(sessionId);
}

export async function getAllCorrections(): Promise<CorrectionLog[]> {
  return await correctionLogRepo.getAll();
}

export async function canSubmitCorrection(): Promise<boolean> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return false;
  const user = await getUserById(firebaseUser.uid);
  if (!user) return false;
  return CORRECTION_ALLOWED_ROLES.includes(user.role);
}
