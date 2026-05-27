import { auth } from '../core/firebase';
import { getUserById } from '../db/repositories/UserRepository';
import {
  SessionRepository,
  CreateSessionPayload,
  Session,
} from '../db/repositories/SessionRepository';
import { SampleRepository } from '../db/repositories/SampleRepository';

// ─────────────────────────────────────────────────────────────
// Custom error for structured field-level errors
// ─────────────────────────────────────────────────────────────

export class SessionError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'SessionError';
    this.field = field;
  }
}

// ─────────────────────────────────────────────────────────────
// Repositories
// ─────────────────────────────────────────────────────────────

const sessionRepository = new SessionRepository();
const sampleRepository = new SampleRepository();

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

export async function getCurrentEvaluator() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new Error('Not authenticated');
  return await getUserById(firebaseUser.uid);
}

export async function createSession(
  payload: Omit<CreateSessionPayload, 'evaluator_id'>
): Promise<Session> {
  const user = auth.currentUser;
  if (!user) throw new SessionError('Not authenticated', 'activeSession');

  // Guard: the user row must exist in SQLite before any insert that
  // references users(id) via a FOREIGN KEY. If it's missing (e.g. the DB
  // was wiped after a schema change), surface a clear message instead of
  // crashing with "FOREIGN KEY constraint failed".
  const localUser = await getUserById(user.uid);
  if (!localUser) {
    throw new SessionError(
      'Your user profile was not found locally. Please log out and log back in to restore it.',
      'activeSession'
    );
  }

  const existingActive = await sessionRepository.getActiveSession(user.uid);
  if (existingActive) {
    throw new SessionError('Evaluator already has an active session', 'activeSession');
  }

  const nameExists = await sessionRepository.nameExists(payload.name, user.uid);
  if (nameExists) {
    throw new SessionError('Session name already exists', 'sessionName');
  }

  const batchExists = await sessionRepository.batchIdentifierExists(
    payload.batch_identifier,
    user.uid
  );
  if (batchExists) {
    throw new SessionError('Batch identifier already exists', 'batchIdentifier');
  }

  if (payload.koh_concentration <= 0) {
    throw new SessionError('KOH concentration must be positive', 'kohConcentration');
  }
  if (payload.incubation_duration <= 0) {
    throw new SessionError('Incubation duration must be positive', 'incubationDuration');
  }
  if (payload.incubation_temp <= 0) {
    throw new SessionError('Incubation temperature must be positive', 'incubationTemperature');
  }

  return await sessionRepository.create({ ...payload, evaluator_id: user.uid });
}

export async function getActiveSession(): Promise<Session | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await sessionRepository.getActiveSession(user.uid);
}

export async function getAllSessions(): Promise<Session[]> {
  const user = auth.currentUser;
  if (!user) return [];
  return await sessionRepository.getAll(user.uid);
}

export async function getSessionById(sessionId: string): Promise<Session> {
  return await sessionRepository.getById(sessionId);
}

export async function completeSession(sessionId: string): Promise<void> {
  const total = await sampleRepository.getCountBySession(sessionId);
  if (total === 0) throw new SessionError('Cannot complete empty session');

  const confirmed = (await sampleRepository.getByStatus(sessionId, 'Confirmed')).length;
  if (confirmed < total) {
    throw new SessionError('All samples must be Confirmed before completing the session');
  }

  await sessionRepository.complete(sessionId);
}

export async function getSessionProgress(sessionId: string) {
  const total = await sampleRepository.getCountBySession(sessionId);
  const confirmed = (await sampleRepository.getByStatus(sessionId, 'Confirmed')).length;
  const pending = (await sampleRepository.getByStatus(sessionId, 'Pending')).length;
  const imageSubmitted = (await sampleRepository.getByStatus(sessionId, 'Image Submitted')).length;

  return {
    total,
    confirmed,
    pending,
    imageSubmitted,
    progress: total === 0 ? 0 : Math.round((confirmed / total) * 100),
  };
}

export async function deleteSession(sessionId: string): Promise<void> {
  await sessionRepository.delete(sessionId);
}

// Legacy alias kept for backward compat
export class SessionService {
  async createSession(payload: CreateSessionPayload) {
    return createSession(payload);
  }
  async completeSession(sessionId: string) {
    return completeSession(sessionId);
  }
  async deleteSession(sessionId: string) {
    return deleteSession(sessionId);
  }
  async getCurrentActiveSession() {
    return getActiveSession();
  }
  async getSessionProgress(sessionId: string) {
    return getSessionProgress(sessionId);
  }
}