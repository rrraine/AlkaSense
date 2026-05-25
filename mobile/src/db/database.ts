import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'alkasense_v2.db';

class DatabaseManager {
  private static instance: SQLite.SQLiteDatabase;

  static getConnection(): SQLite.SQLiteDatabase {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance =
        SQLite.openDatabaseSync(DATABASE_NAME);
    }

    return DatabaseManager.instance;
  }
}

export const db = DatabaseManager.getConnection();

export async function initDatabase(): Promise<void> {

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await createTables();
}

async function createTables(): Promise<void> {

  await db.execAsync(`

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      institution TEXT NOT NULL DEFAULT 'Philippine Rice Research Institute',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      is_deleted INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      evaluator_id TEXT NOT NULL REFERENCES users(id),

      name TEXT NOT NULL UNIQUE,
      batch_identifier TEXT NOT NULL UNIQUE,

      evaluation_date TEXT NOT NULL DEFAULT (datetime('now')),
      completion_date TEXT,

      koh_concentration REAL NOT NULL,
      incubation_duration REAL NOT NULL,
      incubation_temp REAL NOT NULL,

      status TEXT NOT NULL DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS samples (
      id TEXT PRIMARY KEY,

      session_id TEXT NOT NULL
      REFERENCES sessions(id)
      ON DELETE CASCADE,

      sample_identifier TEXT NOT NULL,
      grain_count INTEGER NOT NULL,
      rice_variety TEXT NOT NULL,

      status TEXT NOT NULL DEFAULT 'Pending',

      asv_score INTEGER DEFAULT 0,
      gt_class TEXT DEFAULT 'Null',

      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grain_images (
      id TEXT PRIMARY KEY,

      sample_id TEXT NOT NULL
      REFERENCES samples(id)
      ON DELETE CASCADE,

      file_path TEXT NOT NULL,
      validation_status TEXT NOT NULL,

      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evaluation_records (
      id TEXT PRIMARY KEY,

      sample_id TEXT NOT NULL
      REFERENCES samples(id),

      grain_image_id TEXT
      REFERENCES grain_images(id),

      evaluator_id TEXT NOT NULL
      REFERENCES users(id),

      spreading_pattern TEXT,
      grain_translucency TEXT,
      score_uniformity TEXT,

      anomaly_flags TEXT DEFAULT '[]',

      koh_appearance TEXT,

      predicted_asv_score INTEGER,
      predicted_gt_class TEXT,

      raw_confidence REAL,
      calibrated_certainty REAL,

      overlay_file_path TEXT,

      final_asv_score INTEGER,
      final_gt_class TEXT,

      correction_remark TEXT,

      status TEXT NOT NULL DEFAULT 'For Evaluation',

      evaluation_notes TEXT,

      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      evaluated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS correction_log (
      id TEXT PRIMARY KEY,

      session_id TEXT NOT NULL
      REFERENCES sessions(id),

      sample_id TEXT NOT NULL
      REFERENCES samples(id),

      evaluator_id TEXT NOT NULL
      REFERENCES users(id),

      original_asv_score INTEGER NOT NULL,
      corrected_asv_score INTEGER NOT NULL,

      correction_remark TEXT NOT NULL,

      submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS session_reports (
      id TEXT PRIMARY KEY,

      session_id TEXT NOT NULL
      REFERENCES sessions(id),

      evaluator_id TEXT NOT NULL
      REFERENCES users(id),

      total_samples INTEGER NOT NULL DEFAULT 0,
      total_classified INTEGER NOT NULL DEFAULT 0,
      total_rejected INTEGER NOT NULL DEFAULT 0,
      total_corrections INTEGER NOT NULL DEFAULT 0,

      asv_distribution TEXT NOT NULL DEFAULT '{}',
      gt_distribution TEXT NOT NULL DEFAULT '{}',

      pdf_file_path TEXT,
      csv_file_path TEXT,

      upload_status TEXT NOT NULL DEFAULT 'Generated',

      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,

      user_id TEXT NOT NULL
      REFERENCES users(id),

      action TEXT NOT NULL,
      entity TEXT NOT NULL,

      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

  `);
}

export default db;