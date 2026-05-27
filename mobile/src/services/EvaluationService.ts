import db from '../../src/db/database';

import {
  EvaluationRepository,
  CreateEvaluationPayload,
} from '../../src/db/repositories/EvaluationRepository';

import {
  SampleRepository,
  GTClass,
} from '../../src/db/repositories/SampleRepository';

const evaluationRepository =
  new EvaluationRepository();

const sampleRepository =
  new SampleRepository();

function mapASVToGTClass(
  score: number
): GTClass {

  if (score <= 2) {
    return 'High GT';
  }

  if (score <= 5) {
    return 'Intermediate GT';
  }

  return 'Low GT';
}

export class EvaluationService {

  // ───────────────────────────────────────────────────────────
  // Create Draft Evaluation
  // ───────────────────────────────────────────────────────────

  async createDraftEvaluation(
    payload: CreateEvaluationPayload
  ) {

    const existing =
      await evaluationRepository.getBySample(
        payload.sample_id
      );

    if (existing) {
      throw new Error(
        'Evaluation already exists for sample'
      );
    }

    return await evaluationRepository.create(
      payload
    );
  }

  // ───────────────────────────────────────────────────────────
  // Confirm Evaluation
  // ───────────────────────────────────────────────────────────

  async confirmEvaluation(payload: {
    evaluationId: string;
    sampleId: string;
    final_asv_score: number;
    correction_remark?: string;

    // NEW FIELD
    remark_score_deviation?: string;
  }) {

    const gtClass =
      mapASVToGTClass(
        payload.final_asv_score
      );

    await db.withTransactionAsync(
      async () => {

        await evaluationRepository.confirmEvaluation({
          evaluationId: payload.evaluationId,
          final_asv_score: payload.final_asv_score,
          final_gt_class: gtClass,

          correction_remark: payload.correction_remark,

          // NEW: forward deviation remark
          remark_score_deviation: payload.remark_score_deviation,
        });

        await sampleRepository.updateScore(
          payload.sampleId,
          payload.final_asv_score,
          gtClass
        );
      }
    );
  }

  // ───────────────────────────────────────────────────────────
  // Get Evaluation By Sample
  // ───────────────────────────────────────────────────────────

  async getEvaluationBySample(sampleId: string) {
    return await evaluationRepository.getBySample(sampleId);
  }

  // ───────────────────────────────────────────────────────────
  // Get Confirmed Evaluations
  // ───────────────────────────────────────────────────────────

  async getConfirmedEvaluations(sessionId: string) {
    return await evaluationRepository.getConfirmedEvaluations(sessionId);
  }

  // ───────────────────────────────────────────────────────────
  // Delete Evaluation
  // ───────────────────────────────────────────────────────────

  async deleteEvaluation(evaluationId: string): Promise<void> {
    await evaluationRepository.delete(evaluationId);
  }
}