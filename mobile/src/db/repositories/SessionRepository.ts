import db from '../database';

export type Session = {
  id: string;
  evaluator_id: string;
  location?: string;
  notes?: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  synced: number;
};

// 2. A simple, pure JavaScript UUIDv4 generator (No native dependencies)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class SessionRepository {

  async create(evaluatorId: string, location?: string, notes?: string): Promise<Session> {
    // 3. Use the JS-only generator here
    const id = generateUUID(); 
    
    await db.runAsync(
      `INSERT INTO sessions (id, evaluator_id, location, notes)
       VALUES (?, ?, ?, ?)`,
      [id, evaluatorId, location ?? null, notes ?? null]
    );
    return this.getById(id);
  }

  // ... (rest of your methods stay exactly the same)
  async getById(id: string): Promise<Session> {
    const row = await db.getFirstAsync<Session>(
      `SELECT * FROM sessions WHERE id = ?`, [id]
    );
    if (!row) throw new Error(`Session ${id} not found`);
    return row;
  }

  async getAll(): Promise<Session[]> {
    return await db.getAllAsync<Session>(
      `SELECT * FROM sessions ORDER BY started_at DESC`
    );
  }

  async complete(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE sessions SET status = 'completed', completed_at = datetime('now')
       WHERE id = ?`, [id]
    );
  }

  async cancel(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE sessions SET status = 'cancelled' WHERE id = ?`, [id]
    );
  }

  async markSynced(id: string): Promise<void> {
    await db.runAsync(
      `UPDATE sessions SET synced = 1 WHERE id = ?`, [id]
    );
  }

  async getUnsynced(): Promise<Session[]> {
    return await db.getAllAsync<Session>(
      `SELECT * FROM sessions WHERE synced = 0`
    );
  }
}