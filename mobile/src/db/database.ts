import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('alkasense.db');

export async function initDatabase(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await createTables();
}

async function createTables(): Promise<void> {
  await db.execAsync(`
    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id          TEXT PRIMARY KEY,
      evaluator_id TEXT NOT NULL,
      location    TEXT,
      notes       TEXT,
      status      TEXT NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'completed', 'cancelled')),
      started_at  TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      synced      INTEGER NOT NULL DEFAULT 0
    );

    -- Samples table
    CREATE TABLE IF NOT EXISTS samples (
      id            TEXT PRIMARY KEY,
      session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      variety_name  TEXT NOT NULL,
      asv_score     INTEGER NOT NULL CHECK (asv_score BETWEEN 1 AND 7),
      gt_class      TEXT NOT NULL,
      confidence    REAL CHECK (confidence BETWEEN 0.0 AND 1.0),
      image_path    TEXT NOT NULL,
      heatmap_path  TEXT,
      captured_at   TEXT NOT NULL DEFAULT (datetime('now')),
      synced        INTEGER NOT NULL DEFAULT 0
    );

    -- Grain images table
    CREATE TABLE IF NOT EXISTS grain_images (
      id          TEXT PRIMARY KEY,
      sample_id   TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
      image_path  TEXT NOT NULL,
      image_type  TEXT NOT NULL CHECK (image_type IN ('raw', 'heatmap', 'annotated')),
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Correction log table
    CREATE TABLE IF NOT EXISTS correction_log (
      id              TEXT PRIMARY KEY,
      sample_id       TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
      original_score  INTEGER NOT NULL CHECK (original_score BETWEEN 1 AND 7),
      corrected_score INTEGER NOT NULL CHECK (corrected_score BETWEEN 1 AND 7),
      reason          TEXT,
      corrected_at    TEXT NOT NULL DEFAULT (datetime('now')),
      synced          INTEGER NOT NULL DEFAULT 0
    );

    -- Audit log table
    CREATE TABLE IF NOT EXISTS audit_log (
      id          TEXT PRIMARY KEY,
      action      TEXT NOT NULL,
      entity      TEXT NOT NULL,
      entity_id   TEXT NOT NULL,
      details     TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export default db;