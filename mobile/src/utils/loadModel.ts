import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
import { Asset } from 'expo-asset';

let model: tf.GraphModel | null = null;

export async function loadAlkasenseModel(): Promise<tf.GraphModel> {
  if (model) return model;

  // Wait for TF backend to be ready
  await tf.ready();

  // Load the .tflite asset
  const modelAsset = Asset.fromModule(
    require('../../assets/alkasense_v1.tflite')
  );
  await modelAsset.downloadAsync();

  // Load as a TFLite-compatible graph model via tfjs-react-native
    model = await tf.loadGraphModel(
    modelAsset.localUri!,
    { fromTFHub: false }
    );
  console.log('✅ AlkaSense model loaded');
  return model;
}