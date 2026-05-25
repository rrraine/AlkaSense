export type SessionStatus = 'ACTIVE' | 'CLOSED';

export type SessionRecord = {
  id: string;
  name: string;
  batch_id: string;
  koh_concentration: number;
  incubation_duration: number;
  incubation_temperature: number;
  evaluation_date: string;
  evaluator_id: string;
  status: SessionStatus;
};

export type SessionPayload = Omit<SessionRecord, 'id' | 'status'>;

export type SessionResponse = SessionRecord;
