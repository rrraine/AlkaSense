import { getDatabase } from '../../../db/database';
import { SessionRecord } from '../../../shared/types/session.types';
import { SampleRecord } from '../../../shared/types/sample.types';

export type SampleProgress = SampleRecord & {
  confirmed_asv?: number;
  gt_class?: string;
};

export type SessionProgress = {
  session: SessionRecord;
  samples: SampleProgress[];
  totalSamples: number;
  confirmedCount: number;
  pendingCount: number;
  flaggedCount: number;
  rejectedCount: number;
  correctionCount: number;
  asvDistribution: Record<number, number>;
  gtDistribution: { HIGH: number; INTERMEDIATE: number; LOW: number };
};

export async function fetchSessionProgress(sessionId: string): Promise<SessionProgress> {
  const db = getDatabase();

  const session = await db.getFirstAsync<SessionRecord>(
    'SELECT * FROM sessions WHERE id = ?',
    [sessionId]
  );
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const samples = await db.getAllAsync<SampleRecord>(
    'SELECT * FROM samples WHERE session_id = ? ORDER BY rowid ASC',
    [sessionId]
  );

  const enriched: SampleProgress[] = await Promise.all(
    samples.map(async (s: SampleRecord) => {
      const confirmed = await db.getFirstAsync<{
        final_asv_score: number; gt_class: string;
      }>(
        `SELECT cs.final_asv_score, cs.gt_class
         FROM confirmed_scores cs
         JOIN evaluation_records er ON er.id = cs.evaluation_id
         WHERE er.sample_id = ?
         ORDER BY cs.rowid DESC LIMIT 1`,
        [s.id]
      );
      return {
        ...s,
        confirmed_asv: confirmed?.final_asv_score,
        gt_class: confirmed?.gt_class,
      };
    })
  );

  const confirmedCount = enriched.filter((s) => s.status === 'CONFIRMED').length;

  // ASV distribution from confirmed scores
  const asvRows = await db.getAllAsync<{ final_asv_score: number; count: number }>(
    `SELECT cs.final_asv_score, COUNT(*) as count
     FROM confirmed_scores cs
     JOIN evaluation_records er ON er.id = cs.evaluation_id
     JOIN samples s ON s.id = er.sample_id
     WHERE s.session_id = ?
     GROUP BY cs.final_asv_score`,
    [sessionId]
  );
  const asvDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  for (const row of asvRows) {
    asvDistribution[row.final_asv_score] = row.count;
  }

  // GT distribution from confirmed scores
  const gtRows = await db.getAllAsync<{ gt_class: string; count: number }>(
    `SELECT cs.gt_class, COUNT(*) as count
     FROM confirmed_scores cs
     JOIN evaluation_records er ON er.id = cs.evaluation_id
     JOIN samples s ON s.id = er.sample_id
     WHERE s.session_id = ?
     GROUP BY cs.gt_class`,
    [sessionId]
  );
  const gtDistribution = { HIGH: 0, INTERMEDIATE: 0, LOW: 0 };
  for (const row of gtRows) {
    if (row.gt_class === 'HIGH') gtDistribution.HIGH = row.count;
    else if (row.gt_class === 'INTERMEDIATE') gtDistribution.INTERMEDIATE = row.count;
    else if (row.gt_class === 'LOW') gtDistribution.LOW = row.count;
  }

  // Rejected images count
  const rejRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM grain_images gi
     JOIN samples s ON s.id = gi.sample_id
     WHERE s.session_id = ? AND gi.validation_status IN ('PROTOCOL_VIOLATION', 'QUALITY_FAILURE')`,
    [sessionId]
  );
  const rejectedCount = rejRow?.count ?? 0;

  // Corrections count
  const corrRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM correction_log WHERE session_id = ?`,
    [sessionId]
  );
  const correctionCount = corrRow?.count ?? 0;

  // Flagged (low certainty) count
  const flagRow = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM draft_scores ds
     JOIN evaluation_records er ON er.id = ds.evaluation_id
     JOIN samples s ON s.id = er.sample_id
     WHERE s.session_id = ? AND ds.low_certainty_flag = 1`,
    [sessionId]
  );
  const flaggedCount = flagRow?.count ?? 0;

  return {
    session,
    samples: enriched,
    totalSamples: enriched.length,
    confirmedCount,
    pendingCount: enriched.length - confirmedCount,
    flaggedCount,
    rejectedCount,
    correctionCount,
    asvDistribution,
    gtDistribution,
  };
}
