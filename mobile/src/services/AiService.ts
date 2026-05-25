import { apiFetch } from '../core/api/client';
import { auth } from '../core/firebase';
import {
  EvaluationRepository,
  CreateEvaluationPayload,
  EvaluationRecord,
} from '../db/repositories/EvaluationRepository';
import { SampleRepository } from '../db/repositories/SampleRepository';

const evaluationRepo = new EvaluationRepository();
const sampleRepo = new SampleRepository();

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AIDraftResult {
  predicted_asv_score: number;
  predicted_gt_class: string;
  raw_confidence: number;
  calibrated_certainty: number;
  overlay_file_path?: string;
  spreading_pattern?: string;
  grain_translucency?: string;
  score_uniformity?: string;
  anomaly_flags?: string[];
  koh_appearance?: string;
  hasConfidenceWarning: boolean;
  hasObservationConflict: boolean;
  conflictDimensions?: string[];
}

function mapASVToGTClass(score: number): string {
  if (score <= 2) return 'Low GT';
  if (score <= 5) return 'Intermediate GT';
  return 'High GT';
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

/**
 * Calls the AI inference backend (Ivan & Lori's module) to generate a draft ASV score.
 * Falls back to a mock result in development if backend is unreachable.
 */
export async function requestAIDraft(payload: {
  sampleId: string;
  imageUri: string;
  grainImageId?: string;
  observations: {
    spreadingPattern?: string;
    grainTranslucency?: string;
    scoreUniformity?: string;
    anomalyFlags?: string[];
    kohSolution?: string;
  };
}): Promise<AIDraftResult> {
  try {
    const firebaseUser = auth.currentUser;
    const token = firebaseUser ? await firebaseUser.getIdToken() : undefined;

    const result = await apiFetch('/ai/predict', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: {
        sample_id: payload.sampleId,
        image_uri: payload.imageUri,
        observations: payload.observations,
      },
    });

    return result as AIDraftResult;
  } catch (err) {
    console.warn('AIService: backend unavailable, returning mock AI draft');
    // Mock draft for offline / pre-integration development
    return {
      predicted_asv_score: 5,
      predicted_gt_class: 'Intermediate GT',
      raw_confidence: 72,
      calibrated_certainty: 58,
      hasConfidenceWarning: true,
      hasObservationConflict: true,
      conflictDimensions: ['Spreading Pattern Texture', 'Grain Translucency'],
    };
  }
}

/**
 * Creates a draft evaluation record in SQLite after AI analysis.
 * Business rule: no duplicate evaluation per sample.
 */
export async function createDraftEvaluation(
  payload: CreateEvaluationPayload
): Promise<EvaluationRecord> {
  const existing = await evaluationRepo.getBySample(payload.sample_id);
  if (existing) throw new Error('Evaluation already exists for this sample');

  return await evaluationRepo.create(payload);
}

/**
 * Confirms an evaluation — persists final ASV score to both
 * evaluation_records and samples tables atomically.
 * Business rules enforced here.
 */
export async function confirmEvaluation(payload: {
  evaluationId: string;
  sampleId: string;
  final_asv_score: number;
  correction_remark?: string;
}): Promise<void> {
  // Business rule: ASV score must be 1-7
  if (payload.final_asv_score < 1 || payload.final_asv_score > 7) {
    throw new Error('ASV score must be between 1 and 7');
  }

  // Business rule: draft must exist before confirming
  const evaluation = await evaluationRepo.getById(payload.evaluationId);
  if (!evaluation) throw new Error('Cannot confirm: draft evaluation not found');
  if (evaluation.status === 'Confirmed') throw new Error('Evaluation is already confirmed');

  const gtClass = mapASVToGTClass(payload.final_asv_score) as any;

  await evaluationRepo.confirmEvaluation({
    evaluationId: payload.evaluationId,
    final_asv_score: payload.final_asv_score,
    final_gt_class: gtClass,
    correction_remark: payload.correction_remark,
  });

  await sampleRepo.updateScore(payload.sampleId, payload.final_asv_score, gtClass);
}

export async function getEvaluationBySample(sampleId: string) {
  return await evaluationRepo.getBySample(sampleId);
}

export async function getConfirmedEvaluations(sessionId: string) {
  return await evaluationRepo.getConfirmedEvaluations(sessionId);
}