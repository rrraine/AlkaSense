import type { ASVScore } from './scoring.types';

export type CorrectionLog = {
  id: string;
  confirmed_score_id: string;
  session_id: string;
  sample_id: string;
  original_asv_score: ASVScore;
  corrected_asv_score: ASVScore;
  correction_remark: string;
  submitting_evaluator_id: string;
  submitted_at: string;
};

export type CorrectionPayload = Omit<CorrectionLog, 'id' | 'submitted_at'>;
