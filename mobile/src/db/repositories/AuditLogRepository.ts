import db from '../database';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  created_at: string;
}

export interface CreateAuditLogPayload {
  user_id: string;
  action: string;
  entity: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────

export class AuditLogRepository {

  async create(payload: CreateAuditLogPayload): Promise<AuditLog> {
    const id = generateUUID();

    await db.runAsync(
      `INSERT INTO audit_log (id, user_id, action, entity) VALUES (?, ?, ?, ?)`,
      [id, payload.user_id, payload.action, payload.entity]
    );

    // DEBUG LOG | DELETE AFTERWARDS ---------------------------------
    const inserted = await db.getFirstAsync(
      `SELECT * FROM audit_log WHERE id = ?`,
      [id]
    );
    console.log('✅ AUDIT LOG SAVED TO SQLITE:', JSON.stringify(inserted, null, 2));

    return await this.getById(id);
  }

  async getById(id: string): Promise<AuditLog> {
    const row = await db.getFirstAsync<AuditLog>(
      `SELECT * FROM audit_log WHERE id = ?`,
      [id]
    );
    if (!row) throw new Error(`AuditLog ${id} not found`);
    return row;
  }

  async getByUser(userId: string): Promise<AuditLog[]> {
    return await db.getAllAsync<AuditLog>(
      `SELECT * FROM audit_log WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
  }

  async getAll(): Promise<AuditLog[]> {
    return await db.getAllAsync<AuditLog>(
      `SELECT * FROM audit_log ORDER BY created_at DESC`
    );
  }
}