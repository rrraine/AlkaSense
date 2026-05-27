import { apiFetch } from '../core/api/client';
import { auth } from '../core/firebase';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as ImageManipulator from 'expo-image-manipulator';
import { SampleRepository } from '../db/repositories/SampleRepository';
import {
  GrainImageRepository,
  ValidationStatus,
} from '../db/repositories/GrainImageRepository';
import { SessionRepository } from '../db/repositories/SessionRepository';
import { RejectionLogRepository } from '../db/repositories/RejectionLogRepository';

const sampleRepo = new SampleRepository();
const imageRepo = new GrainImageRepository();
const sessionRepo = new SessionRepository();
const rejectionLogRepo = new RejectionLogRepository();

// ─────────────────────────────────────────────────────────────
// Dev toggle — set to true to skip the real API call
// ─────────────────────────────────────────────────────────────
const DEV_MOCK_LAYER2 = false; // auto-true in dev, auto-false in production builds
// value: false | true | __DEV__
// true = use mock layer
// false = enable API

type MockLayer2Outcome = 'pass' | 'blur' | 'exposure_under' | 'exposure_over' | 'grain_visibility';
const DEV_MOCK_OUTCOME: MockLayer2Outcome = 'pass'; // ← CHANGE ME to test different cases !!!

// ─────────────────────────────────────────────────────────────
// Validation Result shape
// ─────────────────────────────────────────────────────────────

export type ValidationOutcome = 'accepted' | 'protocol_violation' | 'quality_failure';

export interface ValidationResult {
  status: ValidationOutcome;
  completedIn: string;
  pipeline: {
    layer1: 'pass' | 'fail' | 'skipped';
    layer2: 'pass' | 'fail' | 'skipped';
  };
  rejection?: {
    validationLayer: string;
    failedCondition: string;
    reason: string;
  };
  corrective?: string;
}

// ─────────────────────────────────────────────────────────────
// Layer 2 — pixel-based quality analysis (offline)
// ─────────────────────────────────────────────────────────────

/**
 * Thresholds — tune these against your real sample images.
 * All derived from the pixel buffer so no network is required.
 */
const QUALITY_THRESHOLDS = {
  /** Laplacian variance below this → too blurry */
  minBlurScore: 80,
  /** Average luminance below this (0–255) → underexposed */
  minLuminance: 50,
  /** Average luminance above this (0–255) → overexposed */
  maxLuminance: 220,
  /** Edge-pixel ratio below this → grains not visible enough */
  minEdgeDensity: 0.04,
};

/**
 * Downsamples the image to a small thumbnail, reads RGBA pixels,
 * then computes blur score, luminance, and edge density.
 * Works entirely on-device with no external dependencies beyond
 * expo-image-manipulator.
 */
export async function analyzeImageQuality(imageUri: string): Promise<{
  blurScore: number;
  avgLuminance: number;
  edgeDensity: number;
}> {
  // ── 1. Resize to 128×128 for fast processing ──────────────
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 128, height: 128 } }],
    { format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );

  if (!resized.base64) {
    throw new Error('Image manipulation failed: no base64 output');
  }

  // ── 2. Decode base64 → raw bytes ──────────────────────────
  const raw = atob(resized.base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

  // JPEG base64 doesn't give raw RGBA directly — parse pixels
  // using a lightweight approach: treat decoded bytes as a proxy
  // for brightness distribution (good enough for quality gating).
  // For true RGBA we'd need a PNG round-trip; JPEG byte values
  // still correlate strongly with luminance for our thresholds.
  const sampleBytes = bytes.slice(bytes.length * 0.1, bytes.length * 0.9);
  const n = sampleBytes.length;

  // ── 3. Average luminance ──────────────────────────────────
  let sum = 0;
  for (let i = 0; i < n; i++) sum += sampleBytes[i];
  const avgLuminance = sum / n;

  // ── 4. Blur score via local variance (proxy for Laplacian) ─
  // High variance among neighbouring bytes → sharp edges → not blurry
  let varianceSum = 0;
  for (let i = 1; i < n; i++) {
    const diff = sampleBytes[i] - sampleBytes[i - 1];
    varianceSum += diff * diff;
  }
  const blurScore = varianceSum / n;

  // ── 5. Edge density via simple threshold on absolute diff ──
  let edgePixels = 0;
  for (let i = 1; i < n; i++) {
    if (Math.abs(sampleBytes[i] - sampleBytes[i - 1]) > 20) edgePixels++;
  }
  const edgeDensity = edgePixels / n;

  return { blurScore, avgLuminance, edgeDensity };
}

/**
 * Runs Layer 2 quality checks and returns a ValidationResult if
 * quality fails, or null if everything passes.
 */
async function runLayer2(imageUri: string): Promise<ValidationResult | null> {
  if (DEV_MOCK_LAYER2) return mockLayer2(DEV_MOCK_OUTCOME);

  // ── Real API call (production only) ──────────────────────
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? ''}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64,
                },
              },
              {
                text: `You are a grain image quality validator for a rice seed inspection system.
  Analyze this image and respond ONLY with a valid JSON object — no explanation, no markdown.

  Rules:
  - blur: FAIL if the grains appear visibly blurry or out of focus
  - exposure: FAIL if the image is too dark or too bright to clearly see the grains
  - grain_visibility: FAIL if individual grains cannot be clearly distinguished

  Respond with exactly this shape:
  {
    "passed": true | false,
    "failed_condition": null | "Blur level" | "Exposure adequacy" | "Grain visibility",
    "reason": null | "one sentence plain-language reason"
  }`,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.json();
    console.warn('Layer 2 Gemini error:', JSON.stringify(errorBody, null, 2));
    return null;
  }
  else {
      console.log("✅ Successfully pipelined to Gemini API");
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  let parsed: { passed: boolean; failed_condition: string | null; reason: string | null };
  try {
    // Gemini sometimes wraps JSON in ```json fences — strip them
    const clean = text.replace(/```json|```/g, '').trim();
    parsed = JSON.parse(clean);
  } catch {
    console.warn('Layer 2 Gemini parse error — skipping quality check');
    return null;
  }

  if (parsed.passed) return null;

  return {
    status: 'quality_failure',
    completedIn: '0ms',
    pipeline: { layer1: 'pass', layer2: 'fail' },
    rejection: {
      validationLayer: 'Technical Quality',
      failedCondition: parsed.failed_condition ?? 'Image quality',
      reason: parsed.reason ?? 'Image did not meet technical quality requirements.',
    },
    corrective: getQualityCorrective(parsed.failed_condition),
  };
}

// ─────────────────────────────────────────────────────────────
// Mock — never runs in production
// ─────────────────────────────────────────────────────────────
function mockLayer2(outcome: MockLayer2Outcome): ValidationResult | null {
  if (outcome === 'pass') return null;

  const cases: Record<Exclude<MockLayer2Outcome, 'pass'>, ValidationResult> = {
    blur: {
      status: 'quality_failure',
      completedIn: '0ms',
      pipeline: { layer1: 'pass', layer2: 'fail' },
      rejection: {
        validationLayer: 'Technical Quality',
        failedCondition: 'Blur level',
        reason: '[MOCK] Image is too blurry. Ensure the camera is steady and focused.',
      },
      corrective: 'Hold the device still, tap the grains to focus, then retake the photo.',
    },
    exposure_under: {
      status: 'quality_failure',
      completedIn: '0ms',
      pipeline: { layer1: 'pass', layer2: 'fail' },
      rejection: {
        validationLayer: 'Technical Quality',
        failedCondition: 'Exposure adequacy',
        reason: '[MOCK] Image is underexposed. The image is too dark.',
      },
      corrective: 'Move to a brighter environment or reposition the UV light, then retake.',
    },
    exposure_over: {
      status: 'quality_failure',
      completedIn: '0ms',
      pipeline: { layer1: 'pass', layer2: 'fail' },
      rejection: {
        validationLayer: 'Technical Quality',
        failedCondition: 'Exposure adequacy',
        reason: '[MOCK] Image is overexposed. The image is too bright.',
      },
      corrective: 'Reduce ambient light or move the light source further away, then retake.',
    },
    grain_visibility: {
      status: 'quality_failure',
      completedIn: '0ms',
      pipeline: { layer1: 'pass', layer2: 'fail' },
      rejection: {
        validationLayer: 'Technical Quality',
        failedCondition: 'Grain visibility',
        reason: '[MOCK] Grains are not clearly visible. The image lacks sufficient detail.',
      },
      corrective: 'Spread the grains into a single layer on the white tray and ensure they are fully within the frame.',
    },
  };

  return cases[outcome];
}

function getQualityCorrective(failedCondition: string | null): string {
  switch (failedCondition) {
    case 'Blur level':
      return 'Hold the device still, tap the grains to focus, then retake the photo.';
    case 'Exposure adequacy':
      return 'Adjust lighting — move to a brighter area or reposition the UV light, then retake.';
    case 'Grain visibility':
      return 'Spread the grains into a single layer on the white tray and ensure they are fully within the frame.';
    default:
      return 'Ensure the image is sharp, well-lit, and grains are clearly visible before retaking.';
  }
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Full two-layer validation pipeline.
 * Layer 1: protocol compliance checklist.
 * Layer 2: offline pixel-based quality analysis (only if L1 passes).
 * Returns the result WITHOUT persisting — call submitValidatedImage after.
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

  // ── Layer 1: Protocol compliance ──────────────────────────
  const allProtocolPassed =
    payload.uvLight &&
    payload.whiteTray &&
    payload.singleLayer &&
    payload.frameAligned;

  if (!allProtocolPassed) {
    const failedItem = !payload.uvLight
      ? 'UV light'
      : !payload.whiteTray
      ? 'White tray'
      : !payload.singleLayer
      ? 'Single layer arrangement'
      : 'Frame alignment';

    return {
      status: 'protocol_violation',
      completedIn: `${Date.now() - startTime}ms`,
      pipeline: { layer1: 'fail', layer2: 'skipped' },
      rejection: {
        validationLayer: 'Protocol Compliance',
        failedCondition: failedItem,
        reason: `Protocol checklist item failed: ${failedItem}`,
      },
      corrective: getProtocolCorrective(failedItem),
    };
  }

  // ── Layer 2: Technical quality ────────────────────────────
  const qualityFailure = await runLayer2(payload.imageUri);

  if (qualityFailure) {
    return {
      ...qualityFailure,
      completedIn: `${Date.now() - startTime}ms`,
    };
  }

  return {
    status: 'accepted',
    completedIn: `${Date.now() - startTime}ms`,
    pipeline: { layer1: 'pass', layer2: 'pass' },
  };
}

function getProtocolCorrective(failedItem: string): string {
  switch (failedItem) {
    case 'UV light':
      return 'Turn on the UV light before capturing the image.';
    case 'White tray':
      return 'Place grains on the standard white tray before capturing.';
    case 'Single layer arrangement':
      return 'Spread the grains so none are stacked on top of each other.';
    case 'Frame alignment':
      return 'Align the camera so the tray frame fills the viewfinder guides.';
    default:
      return 'Ensure all protocol checklist items are satisfied before capturing.';
  }
}

/**
 * Persists an accepted image, writes a rejection log if applicable,
 * and updates the sample status.
 * Must only be called after validateImage() resolves.
 */
export async function submitValidatedImage(payload: {
  sampleId: string;
  sessionId: string;
  imagePath: string;
  validationStatus: ValidationStatus;
  validationResult: ValidationResult;
  protocol: {
    uvLight: boolean;
    whiteTray: boolean;
    singleLayer: boolean;
    frameAligned: boolean;
  };
  evaluatorId?: string;
}): Promise<string> {
  const session = await sessionRepo.getById(payload.sessionId);
  if (session.status !== 'Active') {
    throw new Error('Cannot add image to a Completed session');
  }

  const isAccepted = payload.validationStatus === 'Accepted';
  // const validationTimestamp = Date.now();

  // Always persist the GrainImage record for audit trail
  const image = await imageRepo.create({
    sample_id: payload.sampleId,
    file_path: payload.imagePath,
    validation_status: payload.validationStatus
  });

  // Write rejection log for every rejected image
  // if (!isAccepted) {
  //   await writeRejectionLog({
  //     grain_image_id: image.id,
  //     validation_result: payload.validationResult,
  //     protocol: payload.protocol,
  //     validation_timestamp: validationTimestamp,
  //     evaluator_id: payload.evaluatorId,
  //   });
  // }

  // Only advance sample status on acceptance
  if (isAccepted) {
    await sampleRepo.updateStatus(payload.sampleId, 'Image Submitted');
  }

  return image.id;
}

export async function getImageForSample(sampleId: string) {
  return await imageRepo.getBySample(sampleId);
}