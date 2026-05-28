import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('alkasense.db');

export async function initDatabase(): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
  await createTables();
  await runMigrations();
}

async function runMigrations(): Promise<void> {

  // ── Migration 001: relax NOT NULL on evaluation_records.grain_image_id ──────
  const evalCols = await db.getAllAsync<{ name: string; notnull: number }>(
    `PRAGMA table_info(evaluation_records)`
  );
  const grainImageCol = evalCols.find((c) => c.name === 'grain_image_id');
  if (grainImageCol && grainImageCol.notnull === 1) {
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE IF NOT EXISTS evaluation_records_new (
        id                TEXT PRIMARY KEY,
        sample_id         TEXT NOT NULL REFERENCES samples(id),
        grain_image_id    TEXT REFERENCES grain_images(id),
        evaluator_id      TEXT NOT NULL REFERENCES users(id),
        evaluation_notes  TEXT,
        status            TEXT NOT NULL DEFAULT 'For Evaluation'
                          CHECK (status IN ('For Evaluation','Draft Generated','Confirmed')),
        created_at        TEXT NOT NULL DEFAULT (datetime('now')),
        evaluated_at      TEXT
      );
      INSERT INTO evaluation_records_new
        SELECT id, sample_id, grain_image_id, evaluator_id,
               evaluation_notes, status, created_at, evaluated_at
        FROM evaluation_records;
      DROP TABLE evaluation_records;
      ALTER TABLE evaluation_records_new RENAME TO evaluation_records;
      PRAGMA foreign_keys = ON;
    `);
    console.log('[DB Migration 001] evaluation_records.grain_image_id is now nullable.');
  }

  // ── Migration 002: replace global UNIQUE on sample_identifier with ──────────
  //    composite UNIQUE (session_id, sample_identifier)
  const sampleIndexes = await db.getAllAsync<{ name: string; unique: number }>(
    `PRAGMA index_list(samples)`
  );
  const hasGlobalUnique = sampleIndexes.some(
    (idx) => idx.unique === 1 && idx.name.startsWith('sqlite_autoindex_samples')
  );
  if (hasGlobalUnique) {
    await db.execAsync(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE IF NOT EXISTS samples_new (
        id                  TEXT PRIMARY KEY,
        session_id          TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        sample_identifier   TEXT NOT NULL,
        grain_count         INTEGER NOT NULL,
        gt_class            TEXT NOT NULL DEFAULT 'Null'
                            CHECK (gt_class IN ('Null','Low GT','Intermediate GT','High GT')),
        asv_score           INTEGER NOT NULL DEFAULT 0
                            CHECK (asv_score BETWEEN 0 AND 7),
        rice_variety        TEXT NOT NULL
                            CHECK (rice_variety IN (
                              'NSIC Rc 222','NSIC Rc 160','PSB Rc 18',
                              'PSB Rc 82','IR64','IR72'
                            )),
        status              TEXT NOT NULL DEFAULT 'Pending'
                            CHECK (status IN ('Confirmed','Image Submitted','Pending')),
        created_at          TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (session_id, sample_identifier)
      );
      INSERT INTO samples_new
        SELECT id, session_id, sample_identifier, grain_count, gt_class,
               asv_score, rice_variety, status, created_at
        FROM samples;
      DROP TABLE samples;
      ALTER TABLE samples_new RENAME TO samples;
      PRAGMA foreign_keys = ON;
    `);
    console.log('[DB Migration 002] samples.sample_identifier is now unique per session only.');
  }

  // ── Migration 003: session_reports — Module 4 upload lifecycle ───────────────
  //    Adds upload_attempts, last_upload_attempt_at, uploaded_at, server_id,
  //    renames timestamp field to generated_at, and changes upload_status
  //    CHECK constraint to NOT_UPLOADED|UPLOADING|UPLOADED|FAILED.
  const srCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(session_reports)`
  );
  if (srCols.length > 0) {
    const hasUploadAttempts = srCols.some((c) => c.name === 'upload_attempts');
    if (!hasUploadAttempts) {
      const hasEndTime = srCols.some((c) => c.name === 'end_time');
      const timestampSrc = hasEndTime ? 'end_time' : "datetime('now')";

      await db.execAsync(`PRAGMA foreign_keys = OFF;`);
      await db.execAsync(`
        CREATE TABLE session_reports_m4 (
          id                      TEXT PRIMARY KEY,
          session_id              TEXT NOT NULL,
          evaluator_id            TEXT NOT NULL,
          total_samples           INTEGER NOT NULL DEFAULT 0,
          total_classified        INTEGER NOT NULL DEFAULT 0,
          total_rejected          INTEGER NOT NULL DEFAULT 0,
          total_corrections       INTEGER NOT NULL DEFAULT 0,
          asv_distribution        TEXT NOT NULL DEFAULT '{}',
          gt_distribution         TEXT NOT NULL DEFAULT '{}',
          pdf_file_path           TEXT,
          csv_file_path           TEXT,
          upload_status           TEXT NOT NULL DEFAULT 'NOT_UPLOADED'
                                  CHECK (upload_status IN (
                                    'NOT_UPLOADED','UPLOADING','UPLOADED','FAILED'
                                  )),
          upload_attempts         INTEGER NOT NULL DEFAULT 0,
          last_upload_attempt_at  TEXT,
          uploaded_at             TEXT,
          server_id               TEXT,
          generated_at            TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      await db.execAsync(`
        INSERT OR IGNORE INTO session_reports_m4 (
          id, session_id, evaluator_id,
          total_samples, total_classified, total_rejected, total_corrections,
          asv_distribution, gt_distribution,
          pdf_file_path, csv_file_path,
          upload_status, generated_at
        )
        SELECT
          id, session_id, evaluator_id,
          COALESCE(total_samples, 0),
          COALESCE(total_classified, 0),
          COALESCE(total_rejected, 0),
          COALESCE(total_corrections, 0),
          COALESCE(asv_distribution, '{}'),
          COALESCE(gt_distribution, '{}'),
          pdf_file_path, csv_file_path,
          CASE COALESCE(upload_status, 'Generated')
            WHEN 'Generated' THEN 'NOT_UPLOADED'
            WHEN 'Uploaded'  THEN 'UPLOADED'
            WHEN 'Failed'    THEN 'FAILED'
            ELSE 'NOT_UPLOADED'
          END,
          COALESCE(${timestampSrc}, datetime('now'))
        FROM session_reports;
      `);
      await db.execAsync(`DROP TABLE session_reports;`);
      await db.execAsync(`ALTER TABLE session_reports_m4 RENAME TO session_reports;`);
      await db.execAsync(`PRAGMA foreign_keys = ON;`);
      console.log('[DB Migration 003] session_reports upgraded with Module 4 upload lifecycle fields.');
    }
  }

  // ── Migration 004: correction_log — Module 4 sync tracking ──────────────────
  //    Adds confirmed_score_id, deviation_remark, synced, sync_attempts,
  //    synced_at. Normalises evaluator column name to evaluator_id.
  const clCols = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info(correction_log)`
  );
  if (clCols.length > 0) {
    const hasSynced = clCols.some((c) => c.name === 'synced');
    if (!hasSynced) {
      const hasEvalId = clCols.some((c) => c.name === 'evaluator_id');
      const hasSubmittingId = clCols.some((c) => c.name === 'submitting_evaluator_id');
      const evalIdSrc = hasEvalId
        ? 'evaluator_id'
        : hasSubmittingId
        ? 'submitting_evaluator_id'
        : null;

      const hasSubmittedAt = clCols.some((c) => c.name === 'submitted_at');
      const createdAtSrc = hasSubmittedAt ? 'submitted_at' : "datetime('now')";

      await db.execAsync(`PRAGMA foreign_keys = OFF;`);
      await db.execAsync(`
        CREATE TABLE correction_log_m4 (
          id                    TEXT PRIMARY KEY,
          session_id            TEXT NOT NULL,
          sample_id             TEXT NOT NULL,
          evaluator_id          TEXT NOT NULL,
          original_asv_score    INTEGER NOT NULL,
          corrected_asv_score   INTEGER NOT NULL DEFAULT 0,
          correction_remark     TEXT NOT NULL,
          confirmed_score_id    TEXT,
          deviation_remark      TEXT,
          synced                INTEGER NOT NULL DEFAULT 0,
          sync_attempts         INTEGER NOT NULL DEFAULT 0,
          created_at            TEXT NOT NULL DEFAULT (datetime('now')),
          synced_at             TEXT
        );
      `);
      if (evalIdSrc) {
        await db.execAsync(`
          INSERT OR IGNORE INTO correction_log_m4 (
            id, session_id, sample_id, evaluator_id,
            original_asv_score, corrected_asv_score, correction_remark,
            created_at
          )
          SELECT
            id, session_id, sample_id, ${evalIdSrc},
            original_asv_score, corrected_asv_score, correction_remark,
            ${createdAtSrc}
          FROM correction_log;
        `);
      }
      await db.execAsync(`DROP TABLE correction_log;`);
      await db.execAsync(`ALTER TABLE correction_log_m4 RENAME TO correction_log;`);
      await db.execAsync(`PRAGMA foreign_keys = ON;`);
      console.log('[DB Migration 004] correction_log upgraded with Module 4 sync fields.');
    }
  }
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
      sample_identifier   TEXT NOT NULL,
      grain_count         INTEGER NOT NULL CHECK (grain_count BETWEEN 1 AND 10),
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
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (session_id, sample_identifier)
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
      grain_image_id    TEXT REFERENCES grain_images(id),
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

    -- Session reports table (Module 4)
    -- upload_status lifecycle: NOT_UPLOADED → UPLOADING → UPLOADED | FAILED
    CREATE TABLE IF NOT EXISTS session_reports (
      id                      TEXT PRIMARY KEY,
      session_id              TEXT NOT NULL,
      evaluator_id            TEXT NOT NULL,
      total_samples           INTEGER NOT NULL DEFAULT 0,
      total_classified        INTEGER NOT NULL DEFAULT 0,
      total_rejected          INTEGER NOT NULL DEFAULT 0,
      total_corrections       INTEGER NOT NULL DEFAULT 0,
      asv_distribution        TEXT NOT NULL DEFAULT '{}',
      gt_distribution         TEXT NOT NULL DEFAULT '{}',
      pdf_file_path           TEXT,
      csv_file_path           TEXT,
      upload_status           TEXT NOT NULL DEFAULT 'NOT_UPLOADED'
                              CHECK (upload_status IN (
                                'NOT_UPLOADED',
                                'UPLOADING',
                                'UPLOADED',
                                'FAILED'
                              )),
      upload_attempts         INTEGER NOT NULL DEFAULT 0,
      last_upload_attempt_at  TEXT,
      uploaded_at             TEXT,
      server_id               TEXT,
      generated_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Correction log table (Module 4)
    -- synced: 0 = pending backend sync, 1 = successfully synced
    CREATE TABLE IF NOT EXISTS correction_log (
      id                    TEXT PRIMARY KEY,
      session_id            TEXT NOT NULL,
      sample_id             TEXT NOT NULL,
      evaluator_id          TEXT NOT NULL,
      original_asv_score    INTEGER NOT NULL,
      corrected_asv_score   INTEGER NOT NULL DEFAULT 0,
      correction_remark     TEXT NOT NULL,
      confirmed_score_id    TEXT,
      deviation_remark      TEXT,
      synced                INTEGER NOT NULL DEFAULT 0,
      sync_attempts         INTEGER NOT NULL DEFAULT 0,
      created_at            TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at             TEXT
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
