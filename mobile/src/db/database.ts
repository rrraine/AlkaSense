import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('alkasense.db');

export function getDatabase(): SQLite.SQLiteDatabase {
  return db;
}

export async function initDatabase(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await createTables();
  await createTargetSchemaTables();
}

async function createTables(): Promise<void> {
  await db.execAsync(`
    -- Sessions table (target schema)
    CREATE TABLE IF NOT EXISTS sessions (
      id                     TEXT PRIMARY KEY,
      name                   TEXT NOT NULL,
      batch_id               TEXT NOT NULL,
      koh_concentration      REAL NOT NULL,
      incubation_duration    REAL NOT NULL,
      incubation_temperature REAL NOT NULL,
      evaluation_date        TEXT NOT NULL,
      evaluator_id           TEXT NOT NULL,
      status                 TEXT NOT NULL DEFAULT 'ACTIVE'
                             CHECK (status IN ('ACTIVE', 'CLOSED'))
    );

    -- Samples table (target schema)
    CREATE TABLE IF NOT EXISTS samples (
      id                TEXT PRIMARY KEY,
      session_id        TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      sample_identifier TEXT NOT NULL,
      rice_variety      TEXT NOT NULL,
      grain_count       INTEGER NOT NULL,
      status            TEXT NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'IMAGE_SUBMITTED', 'CONFIRMED'))
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

async function createTargetSchemaTables(): Promise<void> {
  await db.execAsync(`
    -- Evaluation records (one per sample's evaluation workflow)
    CREATE TABLE IF NOT EXISTS evaluation_records (
      id              TEXT PRIMARY KEY,
      sample_id       TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
      grain_image_id  TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'OBSERVATION_ENTERED'
                      CHECK (status IN ('OBSERVATION_ENTERED', 'DRAFT_GENERATED', 'CONFIRMED'))
    );

    -- Five-dimension observation profiles
    CREATE TABLE IF NOT EXISTS observation_profiles (
      id                       TEXT PRIMARY KEY,
      evaluation_id            TEXT NOT NULL REFERENCES evaluation_records(id) ON DELETE CASCADE,
      spreading_pattern        TEXT NOT NULL,
      grain_translucency       TEXT NOT NULL,
      within_dish_uniformity   TEXT NOT NULL,
      anomaly_flags            TEXT NOT NULL DEFAULT '[]',
      koh_solution_appearance  TEXT NOT NULL
    );

    -- AI draft scores from on-device TFLite inference
    CREATE TABLE IF NOT EXISTS draft_scores (
      id                  TEXT PRIMARY KEY,
      evaluation_id       TEXT NOT NULL REFERENCES evaluation_records(id) ON DELETE CASCADE,
      asv_score           INTEGER NOT NULL CHECK (asv_score BETWEEN 1 AND 7),
      gt_class            TEXT NOT NULL CHECK (gt_class IN ('HIGH', 'INTERMEDIATE', 'LOW')),
      gt_range            TEXT NOT NULL,
      raw_confidence      REAL NOT NULL,
      certainty_score     REAL NOT NULL,
      low_certainty_flag  INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Evaluator-confirmed final scores
    CREATE TABLE IF NOT EXISTS confirmed_scores (
      id                       TEXT PRIMARY KEY,
      evaluation_id            TEXT NOT NULL REFERENCES evaluation_records(id) ON DELETE CASCADE,
      final_asv_score          INTEGER NOT NULL CHECK (final_asv_score BETWEEN 1 AND 7),
      gt_class                 TEXT NOT NULL CHECK (gt_class IN ('HIGH', 'INTERMEDIATE', 'LOW')),
      gt_range                 TEXT NOT NULL,
      ai_draft_used            INTEGER NOT NULL DEFAULT 0,
      deviated_from_draft      INTEGER NOT NULL DEFAULT 0,
      deviation_remark         TEXT,
      confirming_evaluator_id  TEXT NOT NULL,
      confirmed_at             TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Local reference case library (populated on score confirmation)
    CREATE TABLE IF NOT EXISTS reference_cases (
      id                       TEXT PRIMARY KEY,
      evaluation_id            TEXT NOT NULL,
      asv_score                INTEGER NOT NULL CHECK (asv_score BETWEEN 1 AND 7),
      gt_class                 TEXT NOT NULL CHECK (gt_class IN ('HIGH', 'INTERMEDIATE', 'LOW')),
      rice_variety             TEXT NOT NULL,
      image_path               TEXT NOT NULL,
      spreading_pattern        TEXT NOT NULL,
      grain_translucency       TEXT NOT NULL,
      within_dish_uniformity   TEXT NOT NULL,
      anomaly_flags            TEXT NOT NULL DEFAULT '[]',
      koh_solution_appearance  TEXT NOT NULL,
      ai_draft_used            INTEGER NOT NULL DEFAULT 0,
      deviated_from_draft      INTEGER NOT NULL DEFAULT 0,
      session_id               TEXT NOT NULL,
      confirmed_at             TEXT NOT NULL
    );

    -- Image validation rejection log
    CREATE TABLE IF NOT EXISTS rejection_log (
      id                TEXT PRIMARY KEY,
      grain_image_id    TEXT NOT NULL,
      sample_id         TEXT NOT NULL,
      rejection_layer   TEXT NOT NULL,
      rejection_reason  TEXT NOT NULL,
      evaluator_id      TEXT NOT NULL,
      rejected_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Session report upload tracking
    CREATE TABLE IF NOT EXISTS session_reports (
      id                TEXT PRIMARY KEY,
      session_id        TEXT NOT NULL,
      pdf_path          TEXT NOT NULL,
      csv_path          TEXT NOT NULL,
      generated_at      TEXT NOT NULL,
      upload_status     TEXT NOT NULL DEFAULT 'NOT_UPLOADED'
                        CHECK (upload_status IN ('NOT_UPLOADED', 'UPLOADED', 'FAILED')),
      upload_attempts   INTEGER NOT NULL DEFAULT 0,
      last_attempted_at TEXT
    );
  `);
}

export default db;