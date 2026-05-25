import { getDatabase } from '../../../db/database';
import {
  EvaluationRecord,
  ObservationProfile,
  SpreadingPattern,
  GrainTranslucency,
  WithinDishUniformity,
  AnomalyFlag,
  KOHSolutionAppearance,
} from '../../../shared/types/evaluation.types';

export type ObservationInput = {
  spreading_pattern: SpreadingPattern;
  grain_translucency: GrainTranslucency;
  within_dish_uniformity: WithinDishUniformity;
  anomaly_flags: AnomalyFlag[];
  koh_solution_appearance: KOHSolutionAppearance;
};

export function buildObservationPayload(
  evaluationId: string,
  input: ObservationInput
): Omit<ObservationProfile, 'id'> {
  return {
    evaluation_id: evaluationId,
    spreading_pattern: input.spreading_pattern,
    grain_translucency: input.grain_translucency,
    within_dish_uniformity: input.within_dish_uniformity,
    anomaly_flags: input.anomaly_flags,
    koh_solution_appearance: input.koh_solution_appearance,
  };
}

export async function createEvaluationRecord(
  sampleId: string,
  grainImageId: string
): Promise<EvaluationRecord> {
  const db = await getDatabase();
  const id = `eval-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO evaluation_records (id, sample_id, grain_image_id, status)
     VALUES (?, ?, ?, 'OBSERVATION_ENTERED')`,
    [id, sampleId, grainImageId]
  );
  const row = await db.getFirstAsync<EvaluationRecord>(
    'SELECT * FROM evaluation_records WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Evaluation record insert failed');
  return row;
}

export async function submitObservationProfile(
  evaluationId: string,
  input: ObservationInput
): Promise<ObservationProfile> {
  const db = await getDatabase();
  const id = `obs-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO observation_profiles
      (id, evaluation_id, spreading_pattern, grain_translucency,
       within_dish_uniformity, anomaly_flags, koh_solution_appearance)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      evaluationId,
      input.spreading_pattern,
      input.grain_translucency,
      input.within_dish_uniformity,
      JSON.stringify(input.anomaly_flags),
      input.koh_solution_appearance,
    ]
  );
  const row = await db.getFirstAsync<{ id: string; evaluation_id: string; spreading_pattern: string; grain_translucency: string; within_dish_uniformity: string; anomaly_flags: string; koh_solution_appearance: string }>(
    'SELECT * FROM observation_profiles WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Observation profile insert failed');
  return {
    ...row,
    spreading_pattern: row.spreading_pattern as SpreadingPattern,
    grain_translucency: row.grain_translucency as GrainTranslucency,
    within_dish_uniformity: row.within_dish_uniformity as WithinDishUniformity,
    anomaly_flags: JSON.parse(row.anomaly_flags) as AnomalyFlag[],
    koh_solution_appearance: row.koh_solution_appearance as KOHSolutionAppearance,
  };
}

export async function getObservationByEvaluation(
  evaluationId: string
): Promise<ObservationProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: string; evaluation_id: string; spreading_pattern: string; grain_translucency: string; within_dish_uniformity: string; anomaly_flags: string; koh_solution_appearance: string }>(
    'SELECT * FROM observation_profiles WHERE evaluation_id = ?',
    [evaluationId]
  );
  if (!row) return null;
  return {
    ...row,
    spreading_pattern: row.spreading_pattern as SpreadingPattern,
    grain_translucency: row.grain_translucency as GrainTranslucency,
    within_dish_uniformity: row.within_dish_uniformity as WithinDishUniformity,
    anomaly_flags: JSON.parse(row.anomaly_flags) as AnomalyFlag[],
    koh_solution_appearance: row.koh_solution_appearance as KOHSolutionAppearance,
  };
}
