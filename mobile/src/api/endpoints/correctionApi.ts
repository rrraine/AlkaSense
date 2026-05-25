import { apiClient } from '../client';
import { CorrectionPayload } from '../../shared/types/correction.types';

export type CorrectionReceipt = {
  server_id: string;
  received_at: string;
};

export async function submitCorrection(payload: CorrectionPayload): Promise<CorrectionReceipt> {
  const { data } = await apiClient.post<CorrectionReceipt>('/corrections', payload);
  return data;
}
