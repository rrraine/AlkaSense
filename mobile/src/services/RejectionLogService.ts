import {
  RejectionLogRepository,
  RejectionLogRecord,
  RejectionLayer,
} from '../db/repositories/RejectionLogRepository';
import { ValidationResult } from './ImageService';
import { auth } from '../core/firebase';

const rejectionLogRepo = new RejectionLogRepository();

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface WriteRejectionLogPayload {
  grain_image_id: string;
  validation_result: ValidationResult;
  protocol: {
    uvLight: boolean;
    whiteTray: boolean;
    singleLayer: boolean;
    frameAligned: boolean;
  };
  validation_timestamp: number;
  evaluator_id?: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function resolveRejectionLayer(result: ValidationResult): RejectionLayer {
  return result.status === 'protocol_violation' ? 'Protocol' : 'Quality';
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

/**
 * Writes a rejection log entry for a failed validation.
 * Should be called immediately after the GrainImage record is created.
 * Throws if called with an accepted result — guard against misuse.
 */
export async function writeRejectionLog(
  payload: WriteRejectionLogPayload
): Promise<RejectionLogRecord> {
  if (payload.validation_result.status === 'accepted') {
    throw new Error('writeRejectionLog must not be called for accepted images.');
  }

  const rejection = payload.validation_result.rejection;
  if (!rejection) {
    throw new Error('ValidationResult is missing rejection details.');
  }

  const evaluatorId =
    payload.evaluator_id ?? auth.currentUser?.uid ?? 'unknown';

  return await rejectionLogRepo.create({
    grain_image_id: payload.grain_image_id,
    evaluator_id: evaluatorId,
    rejection_layer: resolveRejectionLayer(payload.validation_result),
    checklist_uv_light: payload.protocol.uvLight,
    checklist_white_tray: payload.protocol.whiteTray,
    checklist_single_layer: payload.protocol.singleLayer,
    checklist_frame_aligned: payload.protocol.frameAligned,
    failed_condition: rejection.failedCondition,
    rejection_reason: rejection.reason,
    validation_timestamp: payload.validation_timestamp,
  });
}

export async function getRejectionLogByGrainImage(
  grainImageId: string
): Promise<RejectionLogRecord | null> {
  return await rejectionLogRepo.getByGrainImageId(grainImageId);
}

export async function getRejectionLogsBySample(
  sampleId: string
): Promise<RejectionLogRecord[]> {
  return await rejectionLogRepo.getBySampleId(sampleId);
}