import { getDatabase } from '../../../db/database';
import {
  GrainImageRecord,
  ValidationStatus,
} from '../../../shared/types/image.types';

export type ValidationOutcome = {
  status: ValidationStatus;
  rejection_layer?: string;
  rejection_reason?: string;
  image: GrainImageRecord;
};

export async function fetchValidationResult(imageId: string): Promise<ValidationOutcome | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GrainImageRecord>(
    'SELECT * FROM grain_images WHERE id = ?',
    [imageId]
  );
  if (!row || !row.validation_status) return null;
  return {
    status: row.validation_status,
    rejection_layer: row.rejection_layer ?? undefined,
    rejection_reason: row.rejection_reason ?? undefined,
    image: row,
  };
}

export async function recordValidationResult(
  imageId: string,
  status: ValidationStatus,
  rejectionLayer?: string,
  rejectionReason?: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE grain_images
     SET validation_status = ?, rejection_layer = ?, rejection_reason = ?,
         validation_timestamp = datetime('now')
     WHERE id = ?`,
    [status, rejectionLayer ?? null, rejectionReason ?? null, imageId]
  );
}

export function buildResubmissionContext(outcome: ValidationOutcome): {
  sampleId: string;
  priorImageId: string;
  rejectionReason: string;
} {
  return {
    sampleId: outcome.image.sample_id,
    priorImageId: outcome.image.id,
    rejectionReason: outcome.rejection_reason ?? 'Unknown rejection reason',
  };
}
