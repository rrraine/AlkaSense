import { SessionRepository, Session, CreateSessionPayload } from '../db/repositories/SessionRepository';

const sessionRepo = new SessionRepository();

// ─── Error types ──────────────────────────────────────────────────────────────

export class SessionError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Creates a new session after enforcing all business rules,
 * scoped to the calling evaluator.
 */
export async function createSession(payload: {
  evaluator_id: string;
  name: string;
  batch_identifier: string;
  koh_concentration: number;
  incubation_duration: number;
  incubation_temp: number;
  evaluation_date?: string;
}): Promise<Session> {
  // FR-M1-10: block if this evaluator already has an Active session
  const active = await sessionRepo.getActiveSession(payload.evaluator_id);
  if (active) {
    throw new SessionError(
      'An active session already exists. Complete or close it before creating a new one.',
      'activeSession'
    );
  }

  // FR-M1-05: session name uniqueness per evaluator
  const nameTaken = await sessionRepo.nameExists(payload.name, payload.evaluator_id);
  if (nameTaken) {
    throw new SessionError(
      'A session with this name already exists. Please use a different name.',
      'sessionName'
    );
  }

  // FR-M1-05: batch identifier uniqueness per evaluator
  const batchTaken = await sessionRepo.batchIdentifierExists(payload.batch_identifier, payload.evaluator_id);
  if (batchTaken) {
    throw new SessionError(
      'This batch identifier is already in use. Please use a different one.',
      'batchIdentifier'
    );
  }

  return sessionRepo.create(payload);
}

/**
 * Returns all sessions for the given evaluator, most recent first.
 */
export async function getAllSessions(evaluatorId: string): Promise<Session[]> {
  return sessionRepo.getAll(evaluatorId);
}

/**
 * Returns the Active session for the given evaluator, or null.
 */
export async function getActiveSession(evaluatorId: string): Promise<Session | null> {
  return sessionRepo.getActiveSession(evaluatorId);
}

export async function getSessionById(id: string): Promise<Session> {
  return sessionRepo.getById(id);
}

export async function completeSession(id: string): Promise<void> {
  const session = await sessionRepo.getById(id);
  if (session.status === 'Completed') {
    throw new SessionError('This session is already completed.');
  }
  await sessionRepo.complete(id);
}

export async function getSessionSampleCount(sessionId: string): Promise<number> {
  return sessionRepo.getSampleCount(sessionId);
}