import { auth } from '../core/firebase';
import { getUserById } from '../db/repositories/UserRepository';
import type { User } from '../db/repositories/UserRepository';
import {
  SessionRepository,
  Session,
  CreateSessionPayload,
} from '../db/repositories/SessionRepository';

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

// ─── Auth helper (private) ────────────────────────────────────────────────────

function requireAuthUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new SessionError('No authenticated user found.', 'auth');
  return uid;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export async function getCurrentEvaluator(): Promise<User | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  return getUserById(uid);
}

export async function createSession(
  payload: Omit<CreateSessionPayload, 'evaluator_id'>
): Promise<Session> {
  const evaluatorId = requireAuthUid();

  // FR-M1-10: block if this evaluator already has an Active session
  const active = await sessionRepo.getActiveSession(evaluatorId);
  if (active) {
    throw new SessionError(
      'An active session already exists. Complete or close it before creating a new one.',
      'activeSession'
    );
  }

  // FR-M1-05: session name uniqueness per evaluator
  const nameTaken = await sessionRepo.nameExists(payload.name, evaluatorId);
  if (nameTaken) {
    throw new SessionError(
      'A session with this name already exists. Please use a different name.',
      'sessionName'
    );
  }

  // FR-M1-05: batch identifier uniqueness per evaluator
  const batchTaken = await sessionRepo.batchIdentifierExists(
    payload.batch_identifier,
    evaluatorId
  );
  if (batchTaken) {
    throw new SessionError(
      'This batch identifier is already in use. Please use a different one.',
      'batchIdentifier'
    );
  }

  const repoPayload: CreateSessionPayload = { ...payload, evaluator_id: evaluatorId };
  return sessionRepo.create(repoPayload);
}

export async function getAllSessions(): Promise<Session[]> {
  const evaluatorId = requireAuthUid();
  return sessionRepo.getAll(evaluatorId);
}

export async function getActiveSession(): Promise<Session | null> {
  const evaluatorId = requireAuthUid();
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