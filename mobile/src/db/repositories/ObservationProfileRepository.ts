import db from '../database';
import {
  ObservationProfile,
  SpreadingPattern,
  GrainTranslucency,
  WithinDishUniformity,
  AnomalyFlag,
  KOHSolutionAppearance,
} from '../../shared/types/evaluation.types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type ObservationProfileInput = {
  evaluation_id: string;
  spreading_pattern: SpreadingPattern;
  grain_translucency: GrainTranslucency;
  within_dish_uniformity: WithinDishUniformity;
  anomaly_flags: AnomalyFlag[];
  koh_solution_appearance: KOHSolutionAppearance;
};

type ObservationProfileRow = Omit<ObservationProfile, 'anomaly_flags'> & { anomaly_flags: string };

function deserialize(row: ObservationProfileRow): ObservationProfile {
  return {
    ...row,
    anomaly_flags: JSON.parse(row.anomaly_flags) as AnomalyFlag[],
  };
}

export class ObservationProfileRepository {

  async create(input: ObservationProfileInput): Promise<ObservationProfile> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO observation_profiles
         (id, evaluation_id, spreading_pattern, grain_translucency, within_dish_uniformity, anomaly_flags, koh_solution_appearance)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.evaluation_id,
        input.spreading_pattern,
        input.grain_translucency,
        input.within_dish_uniformity,
        JSON.stringify(input.anomaly_flags),
        input.koh_solution_appearance,
      ]
    );
    return this.getByEvaluation(input.evaluation_id) as Promise<ObservationProfile>;
  }

  async getByEvaluation(evaluationId: string): Promise<ObservationProfile | null> {
    const row = await db.getFirstAsync<ObservationProfileRow>(
      `SELECT * FROM observation_profiles WHERE evaluation_id = ?`, [evaluationId]
    );
    return row ? deserialize(row) : null;
  }
}
