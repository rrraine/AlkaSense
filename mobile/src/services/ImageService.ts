import { apiFetch } from '../core/api/client';
import { auth } from '../core/firebase';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
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
 * Validates an image supposedly using the backend by PhilRice or AI
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

  const startTime = Date.now();

  const allProtocolPassed =
    payload.uvLight &&
    payload.whiteTray &&
    payload.singleLayer &&
    payload.frameAligned;

  const completedIn = `${Date.now() - startTime}ms`;

  if (!allProtocolPassed) {
    return {
      status: 'protocol_violation',
      completedIn,
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

  return {
    status: 'accepted',
    completedIn,
    pipeline: { layer1: 'pass', layer2: 'skipped' },
  };
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

  // // ── Save actual image file locally ──────────────────────────
  // const { status } = await MediaLibrary.requestPermissionsAsync();

  // if (status !== 'granted') {
  // throw new Error('Media library permission denied');
  // }

  //   // Save into app storage first
  // const fileName = `sample_${payload.sampleId}_${Date.now()}.jpg`;

  // const localPath =
  //   FileSystem.documentDirectory + fileName;

  // await FileSystem.copyAsync({
  //   from: payload.imagePath,
  //   to: localPath,
  // });

  // // Save into phone gallery / camera roll
  // await MediaLibrary.saveToLibraryAsync(localPath);

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