import {
  DraftScore,
  DraftScoreRepository,
  CreateDraftScorePayload,
} from '../db/repositories/DraftScoreRepository';

export class DraftScoreService {
  private repository: DraftScoreRepository;

  constructor() {
    this.repository = new DraftScoreRepository();
  }

  async createDraftScore(
    payload: CreateDraftScorePayload
  ): Promise<DraftScore> {
    return this.repository.create(payload);
  }
}