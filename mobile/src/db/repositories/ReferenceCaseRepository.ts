import db from '../database';
import { ReferenceCase } from '../../shared/types/scoring.types';
import { AnomalyFlag } from '../../shared/types/evaluation.types';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

type ReferenceCaseRow = Omit<ReferenceCase, 'anomaly_flags' | 'ai_draft_used' | 'deviated_from_draft'> & {
  anomaly_flags: string;
  ai_draft_used: number;
  deviated_from_draft: number;
};

function deserialize(row: ReferenceCaseRow): ReferenceCase {
  return {
    ...row,
    anomaly_flags: JSON.parse(row.anomaly_flags) as AnomalyFlag[],
    ai_draft_used: row.ai_draft_used === 1,
    deviated_from_draft: row.deviated_from_draft === 1,
  };
}

type ReferenceCaseInput = Omit<ReferenceCase, 'id'>;

export class ReferenceCaseRepository {

  async create(input: ReferenceCaseInput): Promise<ReferenceCase> {
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO reference_cases
         (id, evaluation_id, asv_score, gt_class, rice_variety, image_path,
          spreading_pattern, grain_translucency, within_dish_uniformity, anomaly_flags,
          koh_solution_appearance, ai_draft_used, deviated_from_draft, session_id, confirmed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.evaluation_id,
        input.asv_score,
        input.gt_class,
        input.rice_variety,
        input.image_path,
        input.spreading_pattern,
        input.grain_translucency,
        input.within_dish_uniformity,
        JSON.stringify(input.anomaly_flags),
        input.koh_solution_appearance,
        input.ai_draft_used ? 1 : 0,
        input.deviated_from_draft ? 1 : 0,
        input.session_id,
        input.confirmed_at,
      ]
    );
    return this.getById(id);
  }

  async getById(id: string): Promise<ReferenceCase> {
    const row = await db.getFirstAsync<ReferenceCaseRow>(
      `SELECT * FROM reference_cases WHERE id = ?`, [id]
    );
    if (!row) throw new Error(`ReferenceCase ${id} not found`);
    return deserialize(row);
  }

  async getByASVScore(asvScore: number): Promise<ReferenceCase[]> {
    const rows = await db.getAllAsync<ReferenceCaseRow>(
      `SELECT * FROM reference_cases WHERE asv_score = ? ORDER BY confirmed_at DESC`,
      [asvScore]
    );
    return rows.map(deserialize);
  }

  async getAll(): Promise<ReferenceCase[]> {
    const rows = await db.getAllAsync<ReferenceCaseRow>(
      `SELECT * FROM reference_cases ORDER BY confirmed_at DESC`
    );
    return rows.map(deserialize);
  }
}
