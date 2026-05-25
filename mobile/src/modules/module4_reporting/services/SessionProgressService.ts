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
};

export async function fetchSessionProgress(sessionId: string): Promise<SessionProgress> {
  const db = await getDatabase();

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

  return {
    session,
    samples: enriched,
    totalSamples: enriched.length,
    confirmedCount,
    pendingCount: enriched.length - confirmedCount,
  };
}
