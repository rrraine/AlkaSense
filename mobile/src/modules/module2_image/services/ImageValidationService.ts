import * as FileSystem from 'expo-file-system';
import { Image } from 'react-native';
import { getDatabase } from '../../../db/database';
import { GrainImageRecord, ValidationStatus } from '../../../shared/types/image.types';

// ─── Public types ─────────────────────────────────────────────────────────────

export type ChecklistState = {
  illuminationConfirmed: boolean;
  trayBackgroundConfirmed: boolean;
  grainArrangementConfirmed: boolean;
  dishWithinFrameConfirmed: boolean;
};

export type ValidationOutcome = {
  status: ValidationStatus;
  rejection_layer?: string;
  rejection_reason?: string;
  image: GrainImageRecord;
  elapsed_ms?: number;
};

// ─── Internal types ───────────────────────────────────────────────────────────

type LayerPass = { passed: true };
type LayerFail = { passed: false; layer: string; reason: string };
type LayerResult = LayerPass | LayerFail;

// ─── Layer 1: Protocol Compliance ─────────────────────────────────────────────
// Reads evaluator-confirmed checklist state — first unchecked item fails Layer 1.

const CHECKLIST_ITEMS: [keyof ChecklistState, string][] = [
  ['illuminationConfirmed',    'UV or blacklight illumination not confirmed'],
  ['trayBackgroundConfirmed',  'White tray background not confirmed'],
  ['grainArrangementConfirmed','Grains not arranged in a single layer'],
  ['dishWithinFrameConfirmed', 'Petri dish not fully within the capture frame'],
];

function runLayer1(checklist: ChecklistState): LayerResult {
  for (const [key, label] of CHECKLIST_ITEMS) {
    if (!checklist[key]) {
      return { passed: false, layer: 'Protocol Compliance', reason: label };
    }
  }
  return { passed: true };
}

// ─── Layer 2: Technical Quality ───────────────────────────────────────────────
// Heuristic-based: expo-file-system (size, existence) + Image.getSize (dimensions).
// No ML model — TFLite is for ASV classification in Module 3 only.

function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject)
  );
}

async function runLayer2(imagePath: string): Promise<LayerResult> {
  let fileSize = 0;
  try {
    // expo-file-system v19: getInfoAsync throws at runtime; use new File API instead
    const file = new FileSystem.File(imagePath);
    const info = file.info();
    console.log('[Layer2] file info:', JSON.stringify({ exists: info.exists, size: info.size }));
    if (!info.exists) {
      return {
        passed: false,
        layer: 'Technical Quality',
        reason: 'INVALID_CONTENT: Image file not found or inaccessible',
      };
    }
    fileSize = info.size ?? 0;
  } catch (e) {
    console.log('[Layer2] File.info() error:', e);
    return {
      passed: false,
      layer: 'Technical Quality',
      reason: 'INVALID_CONTENT: Image file not found or inaccessible',
    };
  }

  console.log('[Layer2] fileSize:', fileSize);

  let width = 0;
  let height = 0;
  try {
    ({ width, height } = await getImageDimensions(imagePath));
    console.log('[Layer2] dimensions:', width, 'x', height);
  } catch (e) {
    console.log('[Layer2] getImageDimensions error:', e);
    return {
      passed: false,
      layer: 'Technical Quality',
      reason: 'INVALID_CONTENT: Image dimensions could not be read — file may be corrupt',
    };
  }

  // Check 1: Grain visibility — minimum resolution
  if (width < 200 || height < 200) {
    return {
      passed: false,
      layer: 'Technical Quality',
      reason: 'LOW_DETAIL: Image resolution too low — grain-level detail is not visible',
    };
  }

  // Check 2: Exposure — minimum absolute file size catches near-blank / solid-color images
  if (fileSize < 8000) {
    return {
      passed: false,
      layer: 'Technical Quality',
      reason: 'EMPTY_FRAME: Image appears overexposed or underexposed — ensure adequate lighting before recapturing',
    };
  }

  // Check 3: Focus — bytes-per-pixel ratio; high compression ≈ near-uniform content ≈ blurred
  const bpp = fileSize / (width * height);
  if (bpp < 0.01) {
    return {
      passed: false,
      layer: 'Technical Quality',
      reason: 'UNIFORM_IMAGE: Image appears out of focus — hold the device steady and allow auto-focus to lock before capturing',
    };
  }

  return { passed: true };
}

// ─── Layer 3: Content Plausibility ───────────────────────────────────────────
// Runs only when Layer 2 passes. Checks whether the file is a structurally valid
// JPEG image using magic-byte inspection. Does NOT perform grain classification.
// Conservative by design — errors in this check are non-fatal (skip and pass).

async function runLayerContent(imagePath: string): Promise<LayerResult> {
  try {
    const buffer = await new FileSystem.File(imagePath).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // JPEG SOI marker: 0xFF 0xD8, followed by any marker byte 0xFF
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    console.log('[LayerContent] JPEG magic:', bytes[0]?.toString(16), bytes[1]?.toString(16), bytes[2]?.toString(16), '→', isJpeg);
    if (!isJpeg) {
      return {
        passed: false,
        layer: 'Content Plausibility',
        reason: 'INVALID_CONTENT: The submitted file is not a valid captured image. Please use the camera to recapture or select a valid photo from your gallery.',
      };
    }
  } catch (e) {
    // Non-fatal: if bytes cannot be read, skip this check rather than reject a valid image
    console.log('[LayerContent] arrayBuffer error — skipping JPEG magic check:', e);
  }

  return { passed: true };
}

// ─── Public: full pipeline ────────────────────────────────────────────────────

export async function runValidationPipeline(
  imageId: string,
  imagePath: string,
  checklist: ChecklistState,
  sampleId: string,
  evaluatorId: string
): Promise<ValidationOutcome> {
  const startMs = Date.now();
  console.log('[Validation] start — imageId:', imageId, 'imagePath:', imagePath);
  console.log('[Validation] checklist:', JSON.stringify(checklist));

  const db = getDatabase();

  const layer1 = runLayer1(checklist);
  console.log('[Validation] layer1:', JSON.stringify(layer1));

  let finalStatus: ValidationStatus;
  let rejectionLayer: string | undefined;
  let rejectionReason: string | undefined;

  if (!layer1.passed) {
    finalStatus = 'PROTOCOL_VIOLATION';
    rejectionLayer = layer1.layer;
    rejectionReason = layer1.reason;
  } else {
    const layer2 = await runLayer2(imagePath);
    console.log('[Validation] layer2:', JSON.stringify(layer2));
    if (!layer2.passed) {
      finalStatus = 'QUALITY_FAILURE';
      rejectionLayer = layer2.layer;
      rejectionReason = layer2.reason;
    } else {
      const layerContent = await runLayerContent(imagePath);
      console.log('[Validation] layerContent:', JSON.stringify(layerContent));
      if (!layerContent.passed) {
        finalStatus = 'QUALITY_FAILURE';
        rejectionLayer = layerContent.layer;
        rejectionReason = layerContent.reason;
      } else {
        finalStatus = 'ACCEPTED';
      }
    }
  }

  console.log('[Validation] finalStatus:', finalStatus);

  // FR-M2-16: Update grain_images with validation outcome
  await db.runAsync(
    `UPDATE grain_images
     SET validation_status = ?, rejection_layer = ?, rejection_reason = ?,
         validation_timestamp = datetime('now')
     WHERE id = ?`,
    [finalStatus, rejectionLayer ?? null, rejectionReason ?? null, imageId]
  );
  console.log('[Validation] grain_images updated');

  // FR-M2-17: Write rejection log for every rejected image
  if (finalStatus !== 'ACCEPTED') {
    await db.runAsync(
      `INSERT INTO rejection_log
         (id, grain_image_id, sample_id, rejection_layer, rejection_reason, evaluator_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        `rlog-${Date.now()}`,
        imageId,
        sampleId,
        rejectionLayer!,
        rejectionReason!,
        evaluatorId,
      ]
    );
    console.log('[Validation] rejection_log written');
  }

  const image = await db.getFirstAsync<GrainImageRecord>(
    'SELECT * FROM grain_images WHERE id = ?',
    [imageId]
  );
  console.log('[Validation] image record fetched:', image ? image.id : 'NOT FOUND');
  if (!image) throw new Error('Image record not found after validation');

  return {
    status: finalStatus,
    rejection_layer: rejectionLayer,
    rejection_reason: rejectionReason,
    image,
    elapsed_ms: Date.now() - startMs,
  };
}

// ─── Backward-compatible helpers ──────────────────────────────────────────────

export async function fetchValidationResult(imageId: string): Promise<ValidationOutcome | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<GrainImageRecord>(
    'SELECT * FROM grain_images WHERE id = ?',
    [imageId]
  );
  if (!row || !row.validation_status) return null;
  return {
    status: row.validation_status,
    rejection_layer: row.rejection_layer ?? undefined,
    rejection_reason: row.rejection_reason ?? undefined,
    image: row,
  };
}

export async function recordValidationResult(
  imageId: string,
  status: ValidationStatus,
  rejectionLayer?: string,
  rejectionReason?: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE grain_images
     SET validation_status = ?, rejection_layer = ?, rejection_reason = ?,
         validation_timestamp = datetime('now')
     WHERE id = ?`,
    [status, rejectionLayer ?? null, rejectionReason ?? null, imageId]
  );
}

export function buildResubmissionContext(outcome: ValidationOutcome): {
  sampleId: string;
  priorImageId: string;
  rejectionReason: string;
} {
  return {
    sampleId: outcome.image.sample_id,
    priorImageId: outcome.image.id,
    rejectionReason: outcome.rejection_reason ?? 'Unknown rejection reason',
  };
}
