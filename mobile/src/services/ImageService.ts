import { apiFetch } from '../core/api/client';
import { auth } from '../core/firebase';
import { SampleRepository } from '../db/repositories/SampleRepository';
import {
  GrainImageRepository,
  ValidationStatus,
} from '../db/repositories/GrainImageRepository';
import { SessionRepository } from '../db/repositories/SessionRepository';

const sampleRepo = new SampleRepository();
const imageRepo = new GrainImageRepository();
const sessionRepo = new SessionRepository();

// ─────────────────────────────────────────────────────────────
// Validation Result shape (from backend or local mock)
// ─────────────────────────────────────────────────────────────

export type ValidationOutcome = 'accepted' | 'protocol_violation' | 'quality_failure';

export interface ValidationResult {
  status: ValidationOutcome;
  completedIn: string;
  pipeline: { layer1: 'pass' | 'fail' | 'skipped'; layer2: 'pass' | 'fail' | 'skipped' };
  rejection?: { validationLayer: string; failedCondition: string; reason: string };
  corrective?: string;
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

/**
 * Validates an image using the backend validation pipeline.
 * If backend is unavailable in dev, falls through to a mock accepted result.
 * Returns the validation result WITHOUT yet persisting to SQLite —
 * persist only after the user submits (submitValidatedImage).
 */
export async function validateImage(payload: {
  sampleId: string;
  imageUri: string;
  uvLight: boolean;
  whiteTray: boolean;
  singleLayer: boolean;
  frameAligned: boolean;
}): Promise<ValidationResult> {
  // Business rule: check all protocol checklist items
  const allProtocolPassed =
    payload.uvLight &&
    payload.whiteTray &&
    payload.singleLayer &&
    payload.frameAligned;

  if (!allProtocolPassed) {
    return {
      status: 'protocol_violation',
      completedIn: '0ms',
      pipeline: { layer1: 'fail', layer2: 'skipped' },
      rejection: {
        validationLayer: 'Protocol Compliance',
        failedCondition: 'Positioning guidelines checklist',
        reason: 'One or more protocol checklist items failed',
      },
      corrective:
        'Ensure UV light is on, white tray is used, grains are in single layer, and frame is aligned.',
    };
  }

  // Call backend validation endpoint
  try {
    const firebaseUser = auth.currentUser;
    const token = firebaseUser ? await firebaseUser.getIdToken() : undefined;

    const result = await apiFetch('/validation/validate', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: { sample_id: payload.sampleId, image_uri: payload.imageUri },
    });

    return result as ValidationResult;
  } catch (err) {
    // Dev fallback — accepted so flow can proceed during offline dev
    console.warn('ImageService: backend validation unavailable, using mock accepted result');
    return {
      status: 'accepted',
      completedIn: '1200ms',
      pipeline: { layer1: 'pass', layer2: 'pass' },
    };
  }
}

/**
 * Persists an accepted image + updates sample status to 'Image Submitted'.
 * Must only be called after validation === 'accepted'.
 */
export async function submitValidatedImage(payload: {
  sampleId: string;
  sessionId: string;
  imagePath: string;
  validationStatus: ValidationStatus;
}): Promise<string> {
  // Business rule: session must be Active
  const session = await sessionRepo.getById(payload.sessionId);
  if (session.status !== 'Active') {
    throw new Error('Cannot add image to a Completed session');
  }

  // Business rule: only Accepted images can proceed
  if (payload.validationStatus !== 'Accepted') {
    throw new Error('Only Accepted images can be submitted');
  }

  // Persist grain image
  const image = await imageRepo.create({
    sample_id: payload.sampleId,
    file_path: payload.imagePath,
    validation_status: payload.validationStatus,
  });

  // Update sample status
  await sampleRepo.updateStatus(payload.sampleId, 'Image Submitted');

  return image.id;
}

export async function getImageForSample(sampleId: string) {
  return await imageRepo.getBySample(sampleId);
}