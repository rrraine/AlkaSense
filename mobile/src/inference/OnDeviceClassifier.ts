// Temporary development stub pending native runtime environment.
// Real implementation uses react-native-fast-tflite (TensorflowModel.run) and
// @shopify/react-native-skia (pixel decoding).  Restore this file from git
// history when running in a native build (npx expo run:ios / npx expo run:android).

import { CertaintyComputor } from './CertaintyComputor';
import type { ClassificationResult } from '../shared/types/scoring.types';

const certaintyComputor = new CertaintyComputor();

// djb2 hash — same seed always produces the same logits for the same URI
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

export async function classifyImage(imageUri: string): Promise<ClassificationResult> {
  // Simulate async inference latency so loading-screen animations run realistically
  await new Promise(r => setTimeout(r, 1500));

  const seed = hashStr(imageUri || 'default');

  // Build deterministic logits: 7 baseline values in [-2, +2], then boost one winner
  const logits: number[] = Array.from({ length: 7 }, (_, i) => {
    const v = hashStr(`${seed}-${i}`);
    return ((v % 1000) / 1000) * 4.0 - 2.0;
  });
  const winnerIdx = seed % 7;
  logits[winnerIdx] += 2.0 + ((seed >> 8) % 1000) / 1000;

  return certaintyComputor.compute(logits);
}
