import * as FileSystem from 'expo-file-system';

// Update this constant after running ml/training/export_tflite.py —
// it prints the SHA-256 of the exported file to stdout.
export const EXPECTED_MODEL_SHA256 = 'PLACEHOLDER_REPLACE_AFTER_MODEL_EXPORT';

export async function verifyModelIntegrity(modelUri: string): Promise<boolean> {
  const base64 = await FileSystem.readAsStringAsync(modelUri, {
    encoding: 'base64',
  });

  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // crypto.subtle is available globally in React Native 0.74+
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes.buffer);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hashHex === EXPECTED_MODEL_SHA256;
}
