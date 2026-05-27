import { create } from 'zustand';

interface EvaluationState {

  currentEvaluation: any | null;

  aiDraft: {
    predicted_asv_score: number | null;
    predicted_gt_class: string | null;
    raw_confidence: number | null;
    calibrated_certainty: number | null;
    overlay_file_path: string | null;
  } | null;

  observations: {
    spreading_pattern: string | null;
    grain_translucency: string | null;
    score_uniformity: string | null;
    anomaly_flags: string[];
    koh_appearance: string | null;
  } | null;

  confirmedScore: number | null;

  // ───────────────────────────────────────────────────────────
  // Actions
  // ───────────────────────────────────────────────────────────

  setCurrentEvaluation: (
    evaluation: any | null
  ) => void;

  setAiDraft: (
    draft: any | null
  ) => void;

  setObservations: (
    observations: any | null
  ) => void;

  setConfirmedScore: (
    score: number | null
  ) => void;

  clearEvaluation: () => void;
}

export const useEvaluationStore =
  create<EvaluationState>((set) => ({

    currentEvaluation: null,

    aiDraft: null,

    observations: null,

    confirmedScore: null,

    // ─────────────────────────────────────────────────────────
    // Set Current Evaluation
    // ─────────────────────────────────────────────────────────

    setCurrentEvaluation: (
      evaluation
    ) =>
      set({
        currentEvaluation: evaluation,
      }),

    // ─────────────────────────────────────────────────────────
    // Set AI Draft
    // ─────────────────────────────────────────────────────────

    setAiDraft: (
      draft
    ) =>
      set({
        aiDraft: draft,
      }),

    // ─────────────────────────────────────────────────────────
    // Set Observations
    // ─────────────────────────────────────────────────────────

    setObservations: (
      observations
    ) =>
      set({
        observations,
      }),

    // ─────────────────────────────────────────────────────────
    // Set Confirmed Score
    // ─────────────────────────────────────────────────────────

    setConfirmedScore: (
      score
    ) =>
      set({
        confirmedScore: score,
      }),

    // ─────────────────────────────────────────────────────────
    // Clear Evaluation
    // ─────────────────────────────────────────────────────────

    clearEvaluation: () =>
      set({
        currentEvaluation: null,
        aiDraft: null,
        observations: null,
        confirmedScore: null,
      }),
  }));