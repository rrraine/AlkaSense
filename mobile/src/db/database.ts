/**
 * database.ts
 *
 * Single source-of-truth for the local SQLite database.
 * Exports a ready-to-use `db` instance and an `initDatabase()` function
 * that creates every table the app needs (idempotent — safe to call on
 * every cold start).
 *
 * Drop-in replacement: import db from '../db/database'  (adjust path as needed)
 */

import * as SQLite from 'expo-sqlite';

// ─── Open (or create) the database file ──────────────────────────────────────

const db = SQLite.openDatabaseSync('alkasense.db');

// ─── Schema ───────────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);

  // ── users ──────────────────────────────────────────────────────────────────
  // id = firebase_uid (TEXT, not an auto-increment integer)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT NOT NULL UNIQUE,
      role        TEXT NOT NULL DEFAULT '',
      institution TEXT NOT NULL DEFAULT '',
      is_deleted  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── sessions ───────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id                  TEXT PRIMARY KEY,
      evaluator_id        TEXT NOT NULL,
      name                TEXT NOT NULL,
      batch_identifier    TEXT NOT NULL,
      evaluation_date     TEXT NOT NULL DEFAULT (datetime('now')),
      completion_date     TEXT,
      koh_concentration   REAL NOT NULL,
      incubation_duration INTEGER NOT NULL,
      incubation_temp     REAL NOT NULL,
      status              TEXT NOT NULL DEFAULT 'Active',
      FOREIGN KEY (evaluator_id) REFERENCES users(id)
    );
  `);

  // ── samples ────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS samples (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL,
      variety_name  TEXT NOT NULL,
      asv_score     REAL NOT NULL,
      gt_class      TEXT NOT NULL,
      confidence    REAL NOT NULL,
      image_path    TEXT NOT NULL,
      heatmap_path  TEXT,
      synced        INTEGER NOT NULL DEFAULT 0,
      captured_at   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
  `);

  // ── correction_log ─────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS correction_log (
      id               TEXT PRIMARY KEY,
      sample_id        TEXT NOT NULL,
      original_score   REAL NOT NULL,
      corrected_score  REAL NOT NULL,
      reason           TEXT,
      corrected_at     TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (sample_id) REFERENCES samples(id)
    );
  `);

  // ── audit_log ──────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id         TEXT PRIMARY KEY,
      user_id    TEXT,
      action     TEXT NOT NULL,
      entity     TEXT NOT NULL,
      entity_id  TEXT,
      details    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export default db;