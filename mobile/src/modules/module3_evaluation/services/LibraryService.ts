import { getDatabase } from '../../../db/database';
import { ReferenceCase, ASVScore } from '../../../shared/types/scoring.types';

export type LibraryFilter = {
  asvScores?: ASVScore[];
  riceVariety?: string;
  anomalyFlags?: string[];
  searchQuery?: string;
};

export async function fetchFilteredCases(filter: LibraryFilter): Promise<ReferenceCase[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Omit<ReferenceCase, 'anomaly_flags'> & { anomaly_flags: string }>(
    'SELECT * FROM reference_cases ORDER BY confirmed_at DESC'
  );

  type RawRow = Omit<ReferenceCase, 'anomaly_flags'> & { anomaly_flags: string };
  const cases: ReferenceCase[] = rows.map((r: RawRow) => ({
    ...r,
    anomaly_flags: JSON.parse(r.anomaly_flags) as string[],
  }));

  return cases.filter((c) => {
    if (filter.asvScores?.length && !filter.asvScores.includes(c.asv_score)) return false;
    if (filter.riceVariety && filter.riceVariety !== 'All varieties' && c.rice_variety !== filter.riceVariety) return false;
    if (filter.anomalyFlags?.length) {
      const matchesAnomaly = filter.anomalyFlags.some((f) =>
        f === 'No Anomaly'
          ? c.anomaly_flags.length === 0
          : c.anomaly_flags.includes(f)
      );
      if (!matchesAnomaly) return false;
    }
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      if (
        !c.rice_variety.toLowerCase().includes(q) &&
        !String(c.asv_score).includes(q)
      ) return false;
    }
    return true;
  });
}

export async function fetchCaseDetail(id: string): Promise<ReferenceCase | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Omit<ReferenceCase, 'anomaly_flags'> & { anomaly_flags: string }>(
    'SELECT * FROM reference_cases WHERE id = ?',
    [id]
  );
  if (!row) return null;
  return {
    ...row,
    anomaly_flags: JSON.parse(row.anomaly_flags) as string[],
  };
}

export async function promoteToReferenceCase(evaluationId: string): Promise<void> {
  const db = await getDatabase();

  const confirmed = await db.getFirstAsync<{
    id: string; evaluation_id: string; final_asv_score: number; gt_class: string;
    gt_range: string; ai_draft_used: number; deviated_from_draft: number; confirmed_at: string;
    confirming_evaluator_id: string;
  }>(
    'SELECT * FROM confirmed_scores WHERE evaluation_id = ?',
    [evaluationId]
  );
  if (!confirmed) throw new Error('No confirmed score for evaluation');

  const evalRecord = await db.getFirstAsync<{
    id: string; sample_id: string; grain_image_id: string;
  }>(
    'SELECT * FROM evaluation_records WHERE id = ?',
    [evaluationId]
  );
  if (!evalRecord) throw new Error('Evaluation record not found');

  const obs = await db.getFirstAsync<{
    spreading_pattern: string; grain_translucency: string;
    within_dish_uniformity: string; anomaly_flags: string; koh_solution_appearance: string;
  }>(
    'SELECT * FROM observation_profiles WHERE evaluation_id = ?',
    [evaluationId]
  );

  const sample = await db.getFirstAsync<{
    rice_variety: string; session_id: string;
  }>(
    'SELECT * FROM samples WHERE id = ?',
    [evalRecord.sample_id]
  );

  const image = await db.getFirstAsync<{ image_path: string }>(
    'SELECT image_path FROM grain_images WHERE id = ?',
    [evalRecord.grain_image_id]
  );

  const id = `ref-${Date.now()}`;
  await db.runAsync(
    `INSERT INTO reference_cases
      (id, evaluation_id, asv_score, gt_class, rice_variety, image_path,
       spreading_pattern, grain_translucency, within_dish_uniformity,
       anomaly_flags, koh_solution_appearance, ai_draft_used, deviated_from_draft,
       session_id, confirmed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      evaluationId,
      confirmed.final_asv_score,
      confirmed.gt_class,
      sample?.rice_variety ?? '',
      image?.image_path ?? '',
      obs?.spreading_pattern ?? '',
      obs?.grain_translucency ?? '',
      obs?.within_dish_uniformity ?? '',
      obs?.anomaly_flags ?? '[]',
      obs?.koh_solution_appearance ?? '',
      confirmed.ai_draft_used,
      confirmed.deviated_from_draft,
      sample?.session_id ?? '',
      confirmed.confirmed_at,
    ]
  );
}
