import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

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
    return result;

  } catch (err) {
    console.warn('requestAIDraft failed, using mock:', err);

    // Fallback mock so the app never crashes
    return {
      predicted_asv_score: 5,
      predicted_gt_class: 'Intermediate GT (70-74°C)',
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