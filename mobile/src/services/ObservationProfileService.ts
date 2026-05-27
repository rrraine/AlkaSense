import {
  ObservationProfile,
  ObservationProfileRepository,
  CreateObservationProfilePayload,
} from '../db/repositories/ObservationProfileRepository';

export class ObservationProfileService {
  private repository: ObservationProfileRepository;

  constructor() {
    this.repository = new ObservationProfileRepository();
  }

  async createProfile(
    payload: CreateObservationProfilePayload
  ): Promise<ObservationProfile> {
    return this.repository.create(payload);
  }
}