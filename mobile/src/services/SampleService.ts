import db from '../../src/db/database';

import {
  SampleRepository,
  CreateSamplePayload,
  GTClass,
} from '../../src/db/repositories/SampleRepository';

import { SessionRepository } from '../../src/db/repositories/SessionRepository';

const sampleRepository =
  new SampleRepository();

const sessionRepository =
  new SessionRepository();

export class SampleService {

  // ───────────────────────────────────────────────────────────
  // Register Sample
  // ───────────────────────────────────────────────────────────

  async registerSample(
    payload: CreateSamplePayload
  ) {

    const session =
      await sessionRepository.getById(
        payload.session_id
      );

    if (session.status !== 'Active') {
      throw new Error(
        'Cannot register sample to completed session'
      );
    }

    const identifierExists =
      await sampleRepository.identifierExists(
        payload.sample_identifier,
        payload.session_id
      );

    if (identifierExists) {
      throw new Error(
        'Sample identifier already exists'
      );
    }

    try {
      return await sampleRepository.create(payload);
    } catch (err: any) {
      // SQLite UNIQUE constraint fires when the identifier collides across sessions.
      // Convert the raw driver error into a user-friendly message.
      if (err?.message?.includes('UNIQUE constraint failed')) {
        throw new Error('Sample identifier already exists in this session. Please use a different identifier.');
      }
      throw err;
    }
  }

  // ───────────────────────────────────────────────────────────
  // Submit Image
  // ───────────────────────────────────────────────────────────

  async submitImage(payload: {
    sampleId: string;
    imagePath: string;
    validationStatus: string;
  }) {

    const imageId =
      await sampleRepository.attachImage(
        payload.sampleId,
        payload.imagePath,
        payload.validationStatus
      );

    await sampleRepository.updateStatus(
      payload.sampleId,
      'Image Submitted'
    );

    return imageId;
  }

  // ───────────────────────────────────────────────────────────
  // Confirm Sample Score
  // ───────────────────────────────────────────────────────────

  async confirmSampleScore(payload: {
    sampleId: string;
    asvScore: number;
    gtClass: GTClass;
  }) {

    await sampleRepository.updateScore(
      payload.sampleId,
      payload.asvScore,
      payload.gtClass
    );
  }

  // ───────────────────────────────────────────────────────────
  // Get Samples By Session
  // ───────────────────────────────────────────────────────────

  async getSamplesBySession(
    sessionId: string
  ) {

    return await sampleRepository
      .getBySession(sessionId);
  }

  // ───────────────────────────────────────────────────────────
  // Get Sample Image
  // ───────────────────────────────────────────────────────────

  async getSampleImage(
    sampleId: string
  ) {

    return await sampleRepository
      .getImage(sampleId);
  }

  // ───────────────────────────────────────────────────────────
  // Delete Sample
  // ───────────────────────────────────────────────────────────

  async deleteSample(
    sampleId: string
  ): Promise<void> {

    await db.withTransactionAsync(
      async () => {

        await db.runAsync(
          `
          DELETE FROM evaluation_records
          WHERE sample_id = ?
          `,
          [sampleId]
        );

        await db.runAsync(
          `
          DELETE FROM grain_images
          WHERE sample_id = ?
          `,
          [sampleId]
        );

        await sampleRepository.delete(
          sampleId
        );
      }
    );
  }
}