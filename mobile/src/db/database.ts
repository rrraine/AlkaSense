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

    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      role          TEXT NOT NULL
                    CHECK (role IN (
                      'Researcher',
                      'Field Evaluator',
                      'Lab Technician',
                      'Administrator'
                    )),
      institution   TEXT NOT NULL DEFAULT 'Philippine Rice Research Institute',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      is_deleted    INTEGER NOT NULL DEFAULT 0
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id                    TEXT PRIMARY KEY,
      evaluator_id          TEXT NOT NULL REFERENCES users(id),
      name                  TEXT NOT NULL UNIQUE,
      batch_identifier      TEXT NOT NULL UNIQUE,
      evaluation_date       TEXT NOT NULL DEFAULT (datetime('now')),
      completion_date       TEXT,
      koh_concentration     REAL NOT NULL,
      incubation_duration   REAL NOT NULL,
      incubation_temp       REAL NOT NULL,
      status                TEXT NOT NULL DEFAULT 'Active'
                            CHECK (status IN (
                              'Active',
                              'Completed'
                            ))
    );

    -- Samples table
    CREATE TABLE IF NOT EXISTS samples (
      id                  TEXT PRIMARY KEY,
      session_id          TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      sample_identifier   TEXT NOT NULL UNIQUE,
      grain_count         INTEGER NOT NULL,
      gt_class            TEXT NOT NULL DEFAULT 'Null'
                          CHECK (gt_class IN (
                            'Null',
                            'Low GT',
                            'Intermediate GT',
                            'High GT'
                          )),
      asv_score           INTEGER NOT NULL DEFAULT 0
                          CHECK (asv_score BETWEEN 0 AND 7),
      rice_variety        TEXT NOT NULL
                          CHECK (rice_variety IN (
                            'NSIC Rc 222',
                            'NSIC Rc 160',
                            'PSB Rc 18',
                            'PSB Rc 82',
                            'IR64',
                            'IR72'
                          )),
      status              TEXT NOT NULL DEFAULT 'Pending'
                          CHECK (status IN (
                            'Confirmed',
                            'Image Submitted',
                            'Pending'
                          )),
      created_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Grain images table
    CREATE TABLE IF NOT EXISTS grain_images (
      id                  TEXT PRIMARY KEY,
      sample_id           TEXT NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
      file_path           TEXT NOT NULL UNIQUE,
      validation_status   TEXT NOT NULL
                          CHECK (validation_status IN (
                            'Protocol Violation',
                            'Quality Failure',
                            'Accepted'
                          ))
    );

    -- Rejection log table
    CREATE TABLE IF NOT EXISTS rejection_log (
      id                        TEXT PRIMARY KEY,
      grain_image_id            TEXT NOT NULL UNIQUE REFERENCES grain_images(id),
      evaluator_id              TEXT NOT NULL REFERENCES users(id),
      rejection_layer           TEXT NOT NULL
                                CHECK (rejection_layer IN (
                                  'Protocol',
                                  'Quality'
                                )),
      checklist_uv_light        INTEGER NOT NULL DEFAULT 0,
      checklist_white_tray      INTEGER NOT NULL DEFAULT 0,
      checklist_single_layer    INTEGER NOT NULL DEFAULT 0,
      checklist_frame_aligned   INTEGER NOT NULL DEFAULT 0,
      failed_condition          TEXT NOT NULL,
      rejection_reason          TEXT NOT NULL,
      validation_timestamp      REAL NOT NULL,
      logged_at                 TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Evaluation records table
    CREATE TABLE IF NOT EXISTS evaluation_records (
      id                TEXT PRIMARY KEY,
      sample_id         TEXT NOT NULL REFERENCES samples(id),
      grain_image_id    TEXT NOT NULL REFERENCES grain_images(id),
      evaluator_id      TEXT NOT NULL REFERENCES users(id),
      evaluation_notes  TEXT,
      status            TEXT NOT NULL DEFAULT 'For Evaluation'
                        CHECK (status IN (
                          'For Evaluation',
                          'Draft Generated',
                          'Confirmed'
                        )),
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      evaluated_at      TEXT
    );

    -- Observation profiles table
    CREATE TABLE IF NOT EXISTS observation_profiles (
      id                  TEXT PRIMARY KEY,
      eval_record_id      TEXT NOT NULL UNIQUE REFERENCES evaluation_records(id) ON DELETE CASCADE,
      spreading_pattern   TEXT NOT NULL
                          CHECK (spreading_pattern IN (
                            'Smooth and Continuous',
                            'Ragged and Fragmented',
                            'Partial Spreading Only',
                            'No Spreading'
                          )),
      grain_translucency  TEXT NOT NULL
                          CHECK (grain_translucency IN (
                            'Fully Translucent',
                            'Partially Translucent',
                            'Opaque'
                          )),
      score_uniformity    TEXT NOT NULL
                          CHECK (score_uniformity IN (
                            'Uniform',
                            'Moderate Variation',
                            'High Variation'
                          )),
      anomaly_flags       TEXT NOT NULL DEFAULT '[]',
      koh_appearance      TEXT NOT NULL
                          CHECK (koh_appearance IN (
                            'Clear',
                            'Mildly Clouded',
                            'Heavily Clouded'
                          ))
    );

    -- Draft scores table (AI-generated)
    CREATE TABLE IF NOT EXISTS draft_scores (
      id                          TEXT PRIMARY KEY,
      eval_record_id              TEXT NOT NULL UNIQUE REFERENCES evaluation_records(id) ON DELETE CASCADE,
      predicted_asv_score         INTEGER NOT NULL
                                  CHECK (predicted_asv_score BETWEEN 1 AND 7),
      predicted_gt_class          TEXT NOT NULL DEFAULT 'Null'
                                  CHECK (predicted_gt_class IN (
                                    'Null',
                                    'Low GT',
                                    'Intermediate GT',
                                    'High GT'
                                  )),
      raw_confidence              REAL NOT NULL,
      calibrated_certainty        REAL NOT NULL,
      overlay_file_path           TEXT UNIQUE,
      remark_conflict_resolution  TEXT,
      remark_score_deviation      TEXT
    );

    -- Reference cases table
    CREATE TABLE IF NOT EXISTS reference_cases (
      id                      TEXT PRIMARY KEY,
      evaluator_id            TEXT NOT NULL REFERENCES users(id),
      session_id              TEXT NOT NULL REFERENCES sessions(id),
      sample_id               TEXT NOT NULL REFERENCES samples(id),
      grain_image_id          TEXT NOT NULL REFERENCES grain_images(id),
      eval_record_id          TEXT NOT NULL UNIQUE REFERENCES evaluation_records(id),
      observation_profile_id  TEXT NOT NULL REFERENCES observation_profiles(id),
      draft_score_id          TEXT NOT NULL REFERENCES draft_scores(id)
    );

    -- Session reports table
    CREATE TABLE IF NOT EXISTS session_reports (
      id                    TEXT PRIMARY KEY,

      -- Session snapshot
      session_id            TEXT NOT NULL REFERENCES sessions(id),
      session_name          TEXT NOT NULL,
      evaluator_id          TEXT NOT NULL REFERENCES users(id),
      evaluator_name        TEXT NOT NULL,
      start_time            TEXT NOT NULL,
      end_time              TEXT NOT NULL DEFAULT (datetime('now')),
      total_duration        INTEGER NOT NULL DEFAULT 0,

      -- Sample statistics
      total_samples         INTEGER NOT NULL DEFAULT 0,
      total_classified      INTEGER NOT NULL DEFAULT 0,
      total_rejected        INTEGER NOT NULL DEFAULT 0,
      total_corrections     INTEGER NOT NULL DEFAULT 0,

      -- Distribution snapshots
      asv_distribution      TEXT NOT NULL DEFAULT '{}',
      gt_distribution       TEXT NOT NULL DEFAULT '{}',

      -- Treatment parameters snapshot
      koh_concentration     REAL NOT NULL,
      incubation_duration   REAL NOT NULL,
      incubation_temp       REAL NOT NULL,
      protocol              TEXT NOT NULL DEFAULT 'IRRI Standard',

      pdf_file_path         TEXT,
      csv_file_path         TEXT,
      upload_timestamp      TEXT,
      upload_status         TEXT NOT NULL DEFAULT 'Generated'
                            CHECK (upload_status IN (
                              'Generated',
                              'Uploaded',
                              'Failed'
                            ))
    );

    -- Correction log table
    CREATE TABLE IF NOT EXISTS correction_log (
      id                        TEXT PRIMARY KEY,
      session_id                TEXT NOT NULL REFERENCES sessions(id),
      sample_id                 TEXT NOT NULL REFERENCES samples(id),
      rice_variety              TEXT NOT NULL,
      batch_identifier          TEXT NOT NULL,
      sample_identifier         TEXT NOT NULL,
      original_asv_score        INTEGER NOT NULL,
      corrected_asv_score       INTEGER NOT NULL DEFAULT 0,
      correction_remark         TEXT NOT NULL,
      submitting_evaluator_id   TEXT NOT NULL REFERENCES users(id),
      submitted_at              TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Audit log table
    CREATE TABLE IF NOT EXISTS audit_log (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id),
      action      TEXT NOT NULL,
      entity      TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

  `);
}

export default db;