export type EvaluationStatus =
  | 'OBSERVATION_ENTERED'
  | 'DRAFT_GENERATED'
  | 'CONFIRMED';

export type SpreadingPattern =
  | 'Smooth'
  | 'Ragged'
  | 'Partial'
  | 'No Spreading';

export type GrainTranslucency =
  | 'Fully Translucent'
  | 'Partially Translucent'
  | 'Opaque';

export type WithinDishUniformity =
  | 'Uniform'
  | 'Moderate Variation'
  | 'High Variation';

export type AnomalyFlag =
  | 'Cracking'
  | 'Unilateral'
  | 'Floating'
  | 'None';

export type KOHSolutionAppearance =
  | 'Clear'
  | 'Mildly Clouded'
  | 'Heavily Clouded';

export type EvaluationRecord = {
  id: string;
  sample_id: string;
  grain_image_id: string;
  status: EvaluationStatus;
};

export type ObservationProfile = {
  id: string;
  evaluation_id: string;
  spreading_pattern: SpreadingPattern;
  grain_translucency: GrainTranslucency;
  within_dish_uniformity: WithinDishUniformity;
  anomaly_flags: AnomalyFlag[];
  koh_solution_appearance: KOHSolutionAppearance;
};
