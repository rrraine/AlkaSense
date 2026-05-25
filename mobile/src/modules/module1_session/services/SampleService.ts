import { getDatabase } from '../../../db/database';
import { SamplePayload, SampleRecord } from '../../../shared/types/sample.types';

export function buildSamplePayload(
  sessionId: string,
  sampleIdentifier: string,
  riceVariety: string,
  grainCount: number
): SamplePayload {
  return {
    session_id: sessionId,
    sample_identifier: sampleIdentifier,
    rice_variety: riceVariety,
    grain_count: grainCount,
  };
}

export async function submitSampleRegistration(payload: SamplePayload): Promise<SampleRecord> {
  const db = await getDatabase();
  const id = `sample-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO samples
      (id, session_id, sample_identifier, rice_variety, grain_count, status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [
      id,
      payload.session_id,
      payload.sample_identifier,
      payload.rice_variety,
      payload.grain_count,
    ]
  );
  const row = await db.getFirstAsync<SampleRecord>(
    'SELECT * FROM samples WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Sample insert failed');
  return row;
}

export async function getSamplesBySession(sessionId: string): Promise<SampleRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<SampleRecord>(
    'SELECT * FROM samples WHERE session_id = ? ORDER BY rowid ASC',
    [sessionId]
  );
}

export async function checkSampleIdentifierUnique(
  sessionId: string,
  identifier: string
): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM samples WHERE session_id = ? AND sample_identifier = ?',
    [sessionId, identifier]
  );
  return (result?.count ?? 0) === 0;
}
