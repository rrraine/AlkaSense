export type SampleStatus = 'PENDING' | 'IMAGE_SUBMITTED' | 'CONFIRMED';

export type SampleRecord = {
  id: string;
  session_id: string;
  sample_identifier: string;
  rice_variety: string;
  grain_count: number;
  status: SampleStatus;
};

export type SamplePayload = Omit<SampleRecord, 'id' | 'status'>;
