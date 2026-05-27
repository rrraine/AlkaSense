import { getDatabase } from '../../../db/database';
import { submitCorrection as submitCorrectionApi } from '../../../api/endpoints/correctionApi';
import { CorrectionLog, CorrectionPayload } from '../../../shared/types/correction.types';
import { ASVScore } from '../../../shared/types/scoring.types';

export async function submitCorrection(
  confirmedScoreId: string,
  sessionId: string,
  sampleId: string,
  originalAsvScore: ASVScore,
  correctedAsvScore: ASVScore,
  correctionRemark: string,
  submittingEvaluatorId: string
): Promise<CorrectionLog> {
  const db = getDatabase();
  const id = `corr-${Date.now()}`;
  const submittedAt = new Date().toISOString();

  // Write locally first — the correction is persisted regardless of backend availability
  await db.runAsync(
    `INSERT INTO correction_log
      (id, confirmed_score_id, session_id, sample_id, original_asv_score,
       corrected_asv_score, correction_remark, submitting_evaluator_id, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      confirmedScoreId,
      sessionId,
      sampleId,
      originalAsvScore,
      correctedAsvScore,
      correctionRemark,
      submittingEvaluatorId,
      submittedAt,
    ]
  );

  // Attempt backend sync; failure is non-fatal (correction already saved locally)
  const payload: CorrectionPayload = {
    confirmed_score_id: confirmedScoreId,
    session_id: sessionId,
    sample_id: sampleId,
    original_asv_score: originalAsvScore,
    corrected_asv_score: correctedAsvScore,
    correction_remark: correctionRemark,
    submitting_evaluator_id: submittingEvaluatorId,
  };
  try {
    await submitCorrectionApi(payload);
  } catch (e: any) {
    console.log('[ScoreCorrectionService] backend sync failed, correction saved locally:', e?.message ?? e);
  }

  const row = await db.getFirstAsync<CorrectionLog>(
    'SELECT * FROM correction_log WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Correction log insert failed');
  return row;
}

export async function getCorrectionsBySession(sessionId: string): Promise<CorrectionLog[]> {
  const db = getDatabase();
  return db.getAllAsync<CorrectionLog>(
    'SELECT * FROM correction_log WHERE session_id = ? ORDER BY submitted_at DESC',
    [sessionId]
  );
}
