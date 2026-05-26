import { getDatabase } from '../../../db/database';
import { SessionPayload, SessionRecord } from '../../../shared/types/session.types';

export async function checkNameUnique(name: string, evaluatorId: string): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sessions WHERE name = ? AND evaluator_id = ?',
    [name, evaluatorId]
  );
  return (result?.count ?? 0) === 0;
}

export async function submitSessionCreation(payload: SessionPayload): Promise<SessionRecord> {
  const db = await getDatabase();
  const id = `session-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO sessions
      (id, name, batch_id, koh_concentration, incubation_duration,
       incubation_temperature, evaluation_date, evaluator_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
    [
      id,
      payload.name,
      payload.batch_id,
      payload.koh_concentration,
      payload.incubation_duration,
      payload.incubation_temperature,
      payload.evaluation_date,
      payload.evaluator_id,
    ]
  );
  const row = await db.getFirstAsync<SessionRecord>(
    'SELECT * FROM sessions WHERE id = ?',
    [id]
  );
  if (!row) throw new Error('Session insert failed');
  return row;
}

export async function getActiveSessions(evaluatorId: string): Promise<SessionRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<SessionRecord>(
    "SELECT * FROM sessions WHERE status = 'ACTIVE' AND evaluator_id = ? ORDER BY rowid DESC",
    [evaluatorId]
  );
}

export async function getSessionById(id: string): Promise<SessionRecord | null> {
  const db = await getDatabase();
  return db.getFirstAsync<SessionRecord>('SELECT * FROM sessions WHERE id = ?', [id]);
}

export async function getAllSessions(evaluatorId: string): Promise<SessionRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<SessionRecord>(
    'SELECT * FROM sessions WHERE evaluator_id = ? ORDER BY rowid DESC',
    [evaluatorId]
  );
}

export async function closeSession(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync("UPDATE sessions SET status = 'CLOSED' WHERE id = ?", [id]);
}
