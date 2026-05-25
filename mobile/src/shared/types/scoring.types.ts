export type GTClass = 'HIGH' | 'INTERMEDIATE' | 'LOW';

export type ASVScore = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type DraftScore = {
  id: string;
  evaluation_id: string;
  asv_score: ASVScore;
  gt_class: GTClass;
  gt_range: string;
  raw_confidence: number;
  certainty_score: number;
  low_certainty_flag: boolean;
  created_at: string;
};

export type ConfirmedScore = {
  id: string;
  evaluation_id: string;
  final_asv_score: ASVScore;
  gt_class: GTClass;
  gt_range: string;
  ai_draft_used: boolean;
  deviated_from_draft: boolean;
  deviation_remark: string | null;
  confirming_evaluator_id: string;
  confirmed_at: string;
};

export type ClassificationRequest = {
  image_path: string;
  evaluation_id: string;
};

export type ClassificationResult = {
  asv_score: ASVScore;
  gt_class: GTClass;
  gt_range: string;
  raw_confidence: number;
  certainty_score: number;
  low_certainty_flag: boolean;
};

export type ReferenceCase = {
  id: string;
  evaluation_id: string;
  asv_score: ASVScore;
  gt_class: GTClass;
  rice_variety: string;
  image_path: string;
  spreading_pattern: string;
  grain_translucency: string;
  within_dish_uniformity: string;
  anomaly_flags: string[];
  koh_solution_appearance: string;
  ai_draft_used: boolean;
  deviated_from_draft: boolean;
  session_id: string;
  confirmed_at: string;
};
