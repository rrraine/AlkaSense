import db from '../../src/db/database';

import {
  SessionRepository,
  CreateSessionPayload,
} from '../../src/db/repositories/SessionRepository';

import { SampleRepository } from '../../src/db/repositories/SampleRepository';

const sessionRepository =
  new SessionRepository();

const sampleRepository =
  new SampleRepository();

export class SessionService {

  // ───────────────────────────────────────────────────────────
  // Create Session
  // ───────────────────────────────────────────────────────────

  async createSession(
    payload: CreateSessionPayload
  ) {

    const existingActive =
      await sessionRepository.getActiveSession(
        payload.evaluator_id
      );

    if (existingActive) {
      throw new Error(
        'Evaluator already has an active session'
      );
    }

    const nameExists =
      await sessionRepository.nameExists(
        payload.name,
        payload.evaluator_id
      );

    if (nameExists) {
      throw new Error(
        'Session name already exists'
      );
    }

    const batchExists =
      await sessionRepository.batchIdentifierExists(
        payload.batch_identifier,
        payload.evaluator_id
      );

    if (batchExists) {
      throw new Error(
        'Batch identifier already exists'
      );
    }

    return await sessionRepository.create(
      payload
    );
  }

  // ───────────────────────────────────────────────────────────
  // Complete Session
  // ───────────────────────────────────────────────────────────

  async completeSession(
    sessionId: string
  ): Promise<void> {

    const totalSamples =
      await sampleRepository.getCountBySession(
        sessionId
      );

    if (totalSamples === 0) {
      throw new Error(
        'Cannot complete empty session'
      );
    }

    await sessionRepository.complete(
      sessionId
    );
  }

  // ───────────────────────────────────────────────────────────
  // Delete Session
  // ───────────────────────────────────────────────────────────

  async deleteSession(
    sessionId: string
  ): Promise<void> {

    await sessionRepository.delete(
      sessionId
    );
  }

  // ───────────────────────────────────────────────────────────
  // Get Current Active Session
  // ───────────────────────────────────────────────────────────

  async getCurrentActiveSession() {

    return await sessionRepository
      .getCurrentActiveSession();
  }

  // ───────────────────────────────────────────────────────────
  // Get Session Progress
  // ───────────────────────────────────────────────────────────

  async getSessionProgress(
    sessionId: string
  ) {

    const total =
      await sampleRepository
        .getCountBySession(sessionId);

    const confirmed =
      (
        await sampleRepository.getByStatus(
          sessionId,
          'Confirmed'
        )
      ).length;

    const pending =
      (
        await sampleRepository.getByStatus(
          sessionId,
          'Pending'
        )
      ).length;

    const imageSubmitted =
      (
        await sampleRepository.getByStatus(
          sessionId,
          'Image Submitted'
        )
      ).length;

    return {
      total,
      confirmed,
      pending,
      imageSubmitted,

      progress:
        total === 0
          ? 0
          : Math.round(
              (confirmed / total) * 100
            ),
    };
  }

  // ───────────────────────────────────────────────────────────
  // Reset Session
  // ───────────────────────────────────────────────────────────

  async resetSession(
    sessionId: string
  ): Promise<void> {

    await db.withTransactionAsync(
      async () => {

        await db.runAsync(
          `
          DELETE FROM evaluation_records
          WHERE sample_id IN (
            SELECT id
            FROM samples
            WHERE session_id = ?
          )
          `,
          [sessionId]
        );

        await db.runAsync(
          `
          DELETE FROM grain_images
          WHERE sample_id IN (
            SELECT id
            FROM samples
            WHERE session_id = ?
          )
          `,
          [sessionId]
        );

        await db.runAsync(
          `
          DELETE FROM samples
          WHERE session_id = ?
          `,
          [sessionId]
        );
      }
    );
  }
}