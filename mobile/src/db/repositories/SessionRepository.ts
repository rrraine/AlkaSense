import db from '../database';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionStatus = 'Active' | 'Completed';

export interface Session {
  id: string;
  evaluator_id: string;
  name: string;
  batch_identifier: string;
  evaluation_date: string;
  completion_date: string | null;
  koh_concentration: number;
  incubation_duration: number;
  incubation_temp: number;
  status: SessionStatus;
}

export interface CreateSessionPayload {
  evaluator_id: string;
  name: string;
  batch_identifier: string;
  koh_concentration: number;
  incubation_duration: number;
  incubation_temp: number;
  evaluation_date?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class SessionRepository {

  async create(payload: CreateSessionPayload): Promise<Session> {
    const id = generateUUID();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO sessions (
            id,
            evaluator_id,
            name,
            batch_identifier,
            koh_concentration,
            incubation_duration,
            incubation_temp
            ${payload.evaluation_date ? ', evaluation_date' : ''}
         )
         VALUES (?, ?, ?, ?, ?, ?, ? ${payload.evaluation_date ? ', ?' : ''})`,
        [
          id,
          payload.evaluator_id,
          payload.name.trim(),
          payload.batch_identifier.trim(),
          payload.koh_concentration,
          payload.incubation_duration,
          payload.incubation_temp,
          ...(payload.evaluation_date ? [payload.evaluation_date] : []),
        ]
      );

      // await db.runAsync(
      //   `INSERT INTO audit_log (id, user_id, action, entity)
      //    VALUES (?, ?, 'CREATE', 'session')`,
      //   [generateUUID(), payload.evaluator_id]
      // );
    });

    // return this.getById(id);
    const created = await this.getById(id);
    console.log('[SessionRepository] session created:', JSON.stringify(created, null, 2));
    return created;
  }

  async getById(id: string): Promise<Session> {
    const row = await db.getFirstAsync<Session>(
      `SELECT * FROM sessions WHERE id = ?`,
      [id]
    );
    if (!row) throw new Error(`Session ${id} not found`);
    return row;
  }

  /** Returns only sessions belonging to the given evaluator. */
  async getAll(evaluatorId: string): Promise<Session[]> {
    return await db.getAllAsync<Session>(
      `SELECT * FROM sessions
       WHERE evaluator_id = ?
       ORDER BY evaluation_date DESC`,
      [evaluatorId]
    );
  }

  /** Returns the Active session for the given evaluator, or null. */
  async getActiveSession(evaluatorId: string): Promise<Session | null> {
    const row = await db.getFirstAsync<Session>(
      `SELECT * FROM sessions
       WHERE status = 'Active' AND evaluator_id = ?
       LIMIT 1`,
      [evaluatorId]
    );
    return row ?? null;
  }

  /** Case-insensitive name uniqueness check, scoped to the evaluator. */
  async nameExists(name: string, evaluatorId: string, excludeId?: string): Promise<boolean> {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM sessions
       WHERE LOWER(name) = LOWER(?)
         AND evaluator_id = ?
         ${excludeId ? 'AND id != ?' : ''}`,
      excludeId ? [name.trim(), evaluatorId, excludeId] : [name.trim(), evaluatorId]
    );
    return (row?.count ?? 0) > 0;
  }

  /** Case-insensitive batch identifier uniqueness check, scoped to the evaluator. */
  async batchIdentifierExists(batchIdentifier: string, evaluatorId: string, excludeId?: string): Promise<boolean> {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count
       FROM sessions
       WHERE LOWER(batch_identifier) = LOWER(?)
         AND evaluator_id = ?
         ${excludeId ? 'AND id != ?' : ''}`,
      excludeId ? [batchIdentifier.trim(), evaluatorId, excludeId] : [batchIdentifier.trim(), evaluatorId]
    );
    return (row?.count ?? 0) > 0;
  }

  async complete(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE sessions
       SET status = 'Completed', completion_date = datetime('now')
       WHERE id = ?`,
      [id]
    );
  }

  async getSampleCount(sessionId: string): Promise<number> {
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM samples WHERE session_id = ?`,
      [sessionId]
    );
    return row?.count ?? 0;
  }
}