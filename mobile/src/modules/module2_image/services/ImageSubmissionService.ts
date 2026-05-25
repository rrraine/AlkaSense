import { getDatabase } from '../../../db/database';
import { GrainImageRecord, ImageSubmissionPayload } from '../../../shared/types/image.types';

export function buildImagePayload(
  sampleId: string,
  imagePath: string
): ImageSubmissionPayload {
  return {
    sample_id: sampleId,
    image_path: imagePath,
  };
}

export async function submitImage(payload: ImageSubmissionPayload): Promise<GrainImageRecord> {
  const db = await getDatabase();
  const id = `img-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO grain_images
      (id, sample_id, image_path, submission_status, validation_status)
     VALUES (?, ?, ?, 'SUBMITTED', NULL)`,
    [id, payload.sample_id, payload.image_path]
  );
  const row = await db.getFirstAsync<GrainImageRecord>(
    'SELECT * FROM grain_images WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Image insert failed');
  return row;
}

export async function getImageById(id: string): Promise<GrainImageRecord | null> {
  const db = await getDatabase();
  return db.getFirstAsync<GrainImageRecord>(
    'SELECT * FROM grain_images WHERE id = ?',
    [id]
  );
}

export async function getImagesBySample(sampleId: string): Promise<GrainImageRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<GrainImageRecord>(
    'SELECT * FROM grain_images WHERE sample_id = ? ORDER BY rowid DESC',
    [sampleId]
  );
}
