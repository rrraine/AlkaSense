import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SessionStatus =
  | 'Active'
  | 'Completed';

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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, (c) => {

      const r = (Math.random() * 16) | 0;

      const v =
        c === 'x'
          ? r
          : (r & 0x3) | 0x8;

      return v.toString(16);
    });
}

// ─────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────

export class SessionRepository {

  // ───────────────────────────────────────────────────────────
  // Create Session
  // ───────────────────────────────────────────────────────────

  async create(
    payload: CreateSessionPayload
  ): Promise<Session> {

    const id = generateUUID();

    await db.runAsync(
      `
      INSERT INTO sessions (
        id,
        evaluator_id,
        name,
        batch_identifier,
        koh_concentration,
        incubation_duration,
        incubation_temp,
        evaluation_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        payload.evaluator_id,
        payload.name.trim(),
        payload.batch_identifier.trim(),
        payload.koh_concentration,
        payload.incubation_duration,
        payload.incubation_temp,
        payload.evaluation_date ??
          new Date().toISOString(),
      ]
    );

    const session = await this.getById(id);
    console.log('✅ SESSION SAVED TO SQLITE:', JSON.stringify(session, null, 2));
    return session;
  }

  // ───────────────────────────────────────────────────────────
  // Get Session by ID
  // ───────────────────────────────────────────────────────────

  async getById(id: string): Promise<Session> {

    const row =
      await db.getFirstAsync<Session>(
        `
        SELECT *
        FROM sessions
        WHERE id = ?
        `,
        [id]
      );

    if (!row) {
      throw new Error(
        `Session ${id} not found`
      );
    }

    return row;
  }

  // ───────────────────────────────────────────────────────────
  // Get All Sessions
  // ───────────────────────────────────────────────────────────

  async getAll(
    evaluatorId: string
  ): Promise<Session[]> {

    return await db.getAllAsync<Session>(
      `
      SELECT *
      FROM sessions
      WHERE evaluator_id = ?
      ORDER BY evaluation_date DESC
      `,
      [evaluatorId]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Get Active Session
  // ───────────────────────────────────────────────────────────

  async getActiveSession(
    evaluatorId: string
  ): Promise<Session | null> {

    const row =
      await db.getFirstAsync<Session>(
        `
        SELECT *
        FROM sessions
        WHERE
          evaluator_id = ?
          AND status = 'Active'
        LIMIT 1
        `,
        [evaluatorId]
      );

    return row ?? null;
  }

  // ───────────────────────────────────────────────────────────
  // Get Current Active Session
  // ───────────────────────────────────────────────────────────

  async getCurrentActiveSession(): Promise<Session | null> {

    const row =
      await db.getFirstAsync<Session>(
        `
        SELECT *
        FROM sessions
        WHERE status = 'Active'
        ORDER BY evaluation_date DESC
        LIMIT 1
        `
      );

    return row ?? null;
  }

  // ───────────────────────────────────────────────────────────
  // Session Name Exists
  // ───────────────────────────────────────────────────────────

  async nameExists(
    name: string,
    evaluatorId: string,
    excludeId?: string
  ): Promise<boolean> {

    const row =
      await db.getFirstAsync<{ count: number }>(
        `
        SELECT COUNT(*) as count
        FROM sessions
        WHERE
          LOWER(name) = LOWER(?)
          AND evaluator_id = ?
          ${excludeId ? 'AND id != ?' : ''}
        `,
        excludeId
          ? [
              name.trim(),
              evaluatorId,
              excludeId,
            ]
          : [
              name.trim(),
              evaluatorId,
            ]
      );

    return (row?.count ?? 0) > 0;
  }

  // ───────────────────────────────────────────────────────────
  // Batch Identifier Exists
  // ───────────────────────────────────────────────────────────

  async batchIdentifierExists(
    batchIdentifier: string,
    evaluatorId: string,
    excludeId?: string
  ): Promise<boolean> {

    const row =
      await db.getFirstAsync<{ count: number }>(
        `
        SELECT COUNT(*) as count
        FROM sessions
        WHERE
          LOWER(batch_identifier) =
          LOWER(?)
          AND evaluator_id = ?
          ${excludeId ? 'AND id != ?' : ''}
        `,
        excludeId
          ? [
              batchIdentifier.trim(),
              evaluatorId,
              excludeId,
            ]
          : [
              batchIdentifier.trim(),
              evaluatorId,
            ]
      );

    return (row?.count ?? 0) > 0;
  }

  // ───────────────────────────────────────────────────────────
  // Complete Session
  // ───────────────────────────────────────────────────────────

  async complete(id: string): Promise<void> {

    await db.runAsync(
      `
      UPDATE sessions
      SET
        status = 'Completed',
        completion_date = datetime('now')
      WHERE id = ?
      `,
      [id]
    );
  }

  // ───────────────────────────────────────────────────────────
  // Delete Session
  // Deletes in dependency order so FK enforcement stays ON.
  // Sessions → samples → grain_images cascade automatically
  // once the non-cascading children (evaluation_records,
  // rejection_log, reference_cases) are cleared first.
  // session_reports and correction_log have no FK constraint
  // on session_id so they are cleaned up last for hygiene.
  // ───────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    // 1. reference_cases — FK to sessions, samples, grain_images, eval_records
    await db.runAsync(
      `DELETE FROM reference_cases WHERE session_id = ?`,
      [id]
    );

    // 2. evaluation_records — FK to samples (no CASCADE); also removes
    //    observation_profiles and draft_scores via their CASCADE FKs
    await db.runAsync(
      `DELETE FROM evaluation_records
       WHERE sample_id IN (SELECT id FROM samples WHERE session_id = ?)`,
      [id]
    );

    // 3. rejection_log — FK to grain_images (no CASCADE)
    await db.runAsync(
      `DELETE FROM rejection_log
       WHERE grain_image_id IN (
         SELECT gi.id FROM grain_images gi
         JOIN samples s ON gi.sample_id = s.id
         WHERE s.session_id = ?
       )`,
      [id]
    );

    // 4. sessions DELETE → samples CASCADE → grain_images CASCADE
    await db.runAsync(
      `DELETE FROM sessions WHERE id = ?`,
      [id]
    );

    // 5. Orphan cleanup — no FK constraints, but belong to this session
    await db.runAsync(`DELETE FROM session_reports WHERE session_id = ?`, [id]);
    await db.runAsync(`DELETE FROM correction_log WHERE session_id = ?`, [id]);
  }

  // ───────────────────────────────────────────────────────────
  // Count Samples
  // ───────────────────────────────────────────────────────────

  async getSampleCount(
    sessionId: string
  ): Promise<number> {

    const row =
      await db.getFirstAsync<{ count: number }>(
        `
        SELECT COUNT(*) as count
        FROM samples
        WHERE session_id = ?
        `,
        [sessionId]
      );

    return row?.count ?? 0;
  }
}