import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import { Skia, ColorType, AlphaType } from '@shopify/react-native-skia';
import { ClassificationResult } from '../shared/types/scoring.types';
import { CertaintyComputor } from './CertaintyComputor';

const MODEL_ASSET = require('../../assets/models/alkasense.tflite');
const INPUT_SIZE = 240;
const NUM_CLASSES = 7;

const certaintyComputor = new CertaintyComputor();

let _model: TensorflowModel | null = null;

async function getModel(): Promise<TensorflowModel> {
  if (!_model) {
    _model = await loadTensorflowModel(MODEL_ASSET, []);
  }
  return _model;
}

export async function classifyImage(imageUri: string): Promise<ClassificationResult> {
  const pixels = await decodeToFloat32(imageUri);
  const model = await getModel();

  const outputs = await model.run([pixels.buffer as ArrayBuffer]);
  const logits = Array.from(new Float32Array(outputs[0]));

  if (logits.length !== NUM_CLASSES) {
    throw new Error(`Unexpected model output length: ${logits.length}`);
  }

  const { asv_score, gt_class, gt_range, raw_confidence } = certaintyComputor.compute(logits);
  return { asv_score, gt_class, gt_range, raw_confidence };
}

async function decodeToFloat32(uri: string): Promise<Float32Array> {
  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) throw new Error(`Failed to decode image: ${uri}`);

  const surface = Skia.Surface.Make(INPUT_SIZE, INPUT_SIZE);
  if (!surface) throw new Error('Failed to create Skia surface');

  const canvas = surface.getCanvas();
  const src = { x: 0, y: 0, width: image.width(), height: image.height() };
  const dst = { x: 0, y: 0, width: INPUT_SIZE, height: INPUT_SIZE };
  canvas.drawImageRect(image, src, dst, Skia.Paint());
  surface.flush();

  const snapshotImage = surface.makeImageSnapshot();
  const raw = snapshotImage.readPixels(0, 0, {
    width: INPUT_SIZE,
    height: INPUT_SIZE,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!raw) throw new Error('readPixels returned null');

  const rgba = new Uint8Array(raw.buffer);
  const float32 = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let i = 0; i < INPUT_SIZE * INPUT_SIZE; i++) {
    float32[i * 3 + 0] = rgba[i * 4 + 0] / 255.0;
    float32[i * 3 + 1] = rgba[i * 4 + 1] / 255.0;
    float32[i * 3 + 2] = rgba[i * 4 + 2] / 255.0;
  }
  return float32;
}
