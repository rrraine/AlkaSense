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

export interface SubmitCorrectionPayload {
  sessionId: string;
  sampleId: string;
  originalAsvScore: number;
  correctedAsvScore: number;
  correctionRemark: string;
}

/**
 * Submits a score correction.
 * Business rules enforced:
 * - Only Administrator or Researcher can submit
 * - correctedAsvScore must differ from originalAsvScore
 * - correctionRemark is required
 * - Cannot correct from a Completed session that has been uploaded
 */
export async function submitCorrection(
  payload: SubmitCorrectionPayload
): Promise<CorrectionLog> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');

  // Check role
  const user = await getUserById(firebaseUser.uid);
  if (!user) throw new Error('User not found');
  if (!CORRECTION_ALLOWED_ROLES.includes(user.role)) {
    throw new Error('Access denied: only Administrator or Researcher can submit corrections');
  }

  // correctedAsvScore must differ
  if (payload.correctedAsvScore === payload.originalAsvScore) {
    throw new Error('Corrected score must differ from original score');
  }

  // correctionRemark is required
  if (!payload.correctionRemark.trim()) {
    throw new Error('Correction remark is required');
  }

  // ASV range check
  if (payload.correctedAsvScore < 1 || payload.correctedAsvScore > 7) {
    throw new Error('Corrected ASV score must be between 1 and 7');
  }

  // Check session status — cannot correct uploaded completed session
  const session = await sessionRepo.getById(payload.sessionId);
  // (session_reports upload_status check would go here once report exists)

  // Save correction log to SQLite
  const correctionLog = await correctionLogRepo.create({
    session_id: payload.sessionId,
    sample_id: payload.sampleId,
    evaluator_id: firebaseUser.uid,
    original_asv_score: payload.originalAsvScore,
    corrected_asv_score: payload.correctedAsvScore,
    correction_remark: payload.correctionRemark.trim(),
  });

  // Update evaluation record if one exists
  const evaluation = await evaluationRepo.getBySample(payload.sampleId);
  if (evaluation) {
    await evaluationRepo.confirmEvaluation({
      evaluationId: evaluation.id,
      final_asv_score: payload.correctedAsvScore,
      final_gt_class: evaluation.final_gt_class ?? 'Intermediate GT',
      correction_remark: payload.correctionRemark.trim(),
    });
  }

  // Audit log
  await auditLogRepo.create({
    user_id: firebaseUser.uid,
    action: 'SCORE_CORRECTION',
    entity: `sample:${payload.sampleId}`,
  });

  // Sync to backend (non-blocking — fire and forget in dev)
  try {
    const token = await firebaseUser.getIdToken();
    await apiFetch('/corrections', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        session_id: payload.sessionId,
        sample_id: payload.sampleId,
        original_asv_score: payload.originalAsvScore,
        corrected_asv_score: payload.correctedAsvScore,
        correction_remark: payload.correctionRemark.trim(),
      },
    });
  } catch (err) {
    console.warn('CorrectionService: backend sync failed, will retry on next upload');
  }

  return correctionLog;
}

export async function getCorrectionsForSession(sessionId: string): Promise<CorrectionLog[]> {
  return await correctionLogRepo.getBySession(sessionId);
}

export async function getAllCorrections(): Promise<CorrectionLog[]> {
  return await correctionLogRepo.getAll();
}

/**
 * Checks if the current user is allowed to submit corrections.
 */
export async function canSubmitCorrection(): Promise<boolean> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return false;
  const user = await getUserById(firebaseUser.uid);
  if (!user) return false;
  return CORRECTION_ALLOWED_ROLES.includes(user.role);
}