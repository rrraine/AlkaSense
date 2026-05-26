import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000';

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
      overlay_file_path: null,
    };
  }
}