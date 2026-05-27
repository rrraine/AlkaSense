import * as tf from '@tensorflow/tfjs';
import { loadAlkasenseModel } from './loadModel';

export async function runAlkasense(inputData: number[]): Promise<number[]> {
  const model = await loadAlkasenseModel();

  // Shape this to match your model's expected input, e.g. [1, 224, 224, 3]
  const inputTensor = tf.tensor(inputData, [1, /* your input shape */]);

  const outputTensor = model.predict(inputTensor) as tf.Tensor;
  const results = await outputTensor.data();

  // Cleanup to avoid memory leaks
  inputTensor.dispose();
  outputTensor.dispose();

  return Array.from(results);
}