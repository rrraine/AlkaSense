import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import {
  EvaluationRepository,
  CreateEvaluationPayload,
  EvaluationRecord,
} from '../db/repositories/EvaluationRepository';
import { SampleRepository } from '../db/repositories/SampleRepository';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';
const evaluationRepo = new EvaluationRepository();
const sampleRepo = new SampleRepository();

type GTClass = 'Null' | 'Low GT' | 'Intermediate GT' | 'High GT';

function normalizePredictedGTClass(value: string | null | undefined): GTClass {
  if (!value) return 'Null';
  if (value === 'High GT' || value === 'Intermediate GT' || value === 'Low GT') {
    return value;
  }
  if (value.startsWith('High GT')) return 'High GT';
  if (value.startsWith('Intermediate GT')) return 'Intermediate GT';
  if (value.startsWith('Low GT')) return 'Low GT';
  return 'Null';
}

export type ExplainBullet = { label: string; text: string };

export type AIExplainResult = {
  heatmap_base64: string | null;
  heatmap_available: boolean;
  explanation_bullets: ExplainBullet[];
};

export async function requestAIDraft({
  sampleId,
  imageUri,
  grainImageId,
  observations,
}: {
  sampleId: string;
  imageUri: string;
  grainImageId?: string | null;
  observations: {
    spreadingPattern?: string;
    grainTranslucency?: string;
    scoreUniformity?: string;
    anomalyFlags?: string[];
    kohSolution?: string;
  };
}) {
  try {
    if (!imageUri) {
      console.warn('requestAIDraft called without imageUri, using mock');
      return {
        predicted_asv_score: 5,
        predicted_gt_class: 'Intermediate GT',
        raw_confidence: 72,
        calibrated_certainty: 58,
        hasConfidenceWarning: true,
        hasObservationConflict: false,
        conflictDimensions: [],
        all_scores: [0.02, 0.03, 0.05, 0.10, 0.60, 0.15, 0.05],
        overlay_file_path: null,
      };
    }

    // Build multipart form
    const formData = new FormData();

    // Append image
    const filename = imageUri.split('/').pop() ?? 'sample.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('image', { uri: imageUri, name: filename, type } as any);

    // Append observations
    if (observations.spreadingPattern)
      formData.append('spreading_pattern', observations.spreadingPattern);
    if (observations.grainTranslucency)
      formData.append('grain_translucency', observations.grainTranslucency);
    if (observations.scoreUniformity)
      formData.append('score_uniformity', observations.scoreUniformity);
    if (observations.kohSolution)
      formData.append('koh_solution', observations.kohSolution);
    if (observations.anomalyFlags?.length)
      formData.append('anomaly_flags', observations.anomalyFlags.join(','));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${API_URL}/ai/predict`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const result = await response.json();
    return {
      ...result,
      predicted_gt_class: normalizePredictedGTClass(result.predicted_gt_class),
    };

  } catch (err) {
    console.warn('requestAIDraft failed, using mock:', err);

    // Fallback mock so the app never crashes
    return {
      predicted_asv_score: 5,
      predicted_gt_class: 'Intermediate GT',
      raw_confidence: 72,
      calibrated_certainty: 58,
      hasConfidenceWarning: true,
      hasObservationConflict: false,
      conflictDimensions: [],
      all_scores: [0.02, 0.03, 0.05, 0.10, 0.60, 0.15, 0.05],
      overlay_file_path: null,
    };
  }
}

export async function requestAIExplainability({
  imageUri,
  asvScore,
  calibratedCertainty,
  allScores,
}: {
  imageUri: string;
  asvScore: number;
  calibratedCertainty: number;
  allScores: number[];
}): Promise<AIExplainResult> {
  try {
    const formData = new FormData();

    const filename = imageUri.split('/').pop() ?? 'sample.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('image', { uri: imageUri, name: filename, type } as any);
    formData.append('asv_score', String(asvScore));
    formData.append('calibrated_certainty', String(calibratedCertainty));
    formData.append('all_scores', allScores.join(','));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${API_URL}/ai/explain`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    return await response.json();
  } catch (err) {
    console.warn('requestAIExplainability failed:', err);
    return {
      heatmap_base64: null,
      heatmap_available: false,
      explanation_bullets: [
        { label: 'Edge spreading pattern', text: 'Unable to load analysis. Check your connection and try again.' },
        { label: 'Center translucency', text: 'Analysis unavailable offline.' },
        { label: 'Overall morphology', text: 'Connect to the backend server to generate AI explanations.' },
      ],
    };
  }
}

function mapASVToGTClass(score: number): 'Low GT' | 'Intermediate GT' | 'High GT' {
  if (score <= 2) return 'High GT';
  if (score <= 5) return 'Intermediate GT';
  return 'Low GT';
}

/**
 * Idempotent draft creation used by the AI loading flow.
 */
export async function createDraftEvaluation(
  payload: CreateEvaluationPayload
): Promise<EvaluationRecord> {
  const existing = await evaluationRepo.getBySample(payload.sample_id);
  if (existing) {
    return existing;
  }
  return await evaluationRepo.create(payload);
}

/**
 * Confirms an AI evaluation and mirrors final score to samples table
 * so SessionProgress and ASV distribution reflect the official output.
 */
export async function confirmEvaluation(payload: {
  evaluationId: string;
  sampleId: string;
  final_asv_score: number;
  correction_remark?: string;
}): Promise<void> {
  if (payload.final_asv_score < 1 || payload.final_asv_score > 7) {
    throw new Error('ASV score must be between 1 and 7');
  }

  const gtClass = mapASVToGTClass(payload.final_asv_score);

  await evaluationRepo.confirmEvaluation({
    evaluationId: payload.evaluationId,
    final_asv_score: payload.final_asv_score,
    final_gt_class: gtClass,
    correction_remark: payload.correction_remark,
  });

  await sampleRepo.updateScore(payload.sampleId, payload.final_asv_score, gtClass);
}