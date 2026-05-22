# scripts/export_tflite.py

import os, yaml, glob, re
import tensorflow as tf

with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

SAVED_DIR  = cfg["export"]["saved_model_dir"]
TFLITE_DIR = cfg["export"]["tflite_dir"]
QUANTIZE   = cfg["export"]["quantize"]
os.makedirs(TFLITE_DIR, exist_ok=True)


def get_latest_saved_model() -> str:
    models = sorted(glob.glob(f"{SAVED_DIR}/alkasense_*"))
    if not models:
        raise FileNotFoundError("No SavedModel found. Run train.py first.")
    return models[-1]


def get_next_version() -> int:
    existing = glob.glob(f"{TFLITE_DIR}/alkasense_v*.tflite")
    if not existing:
        return 1
    versions = [int(re.search(r"v(\d+)", f).group(1)) for f in existing]
    return max(versions) + 1


def export():
    model_path = get_latest_saved_model()
    version    = get_next_version()
    out_path   = f"{TFLITE_DIR}/alkasense_v{version}.tflite"

    print(f"[INFO] Converting: {model_path} → {out_path}")

    converter = tf.lite.TFLiteConverter.from_saved_model(model_path)

    if QUANTIZE:
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        print("[INFO] INT8 post-training quantization enabled.")

    tflite_model = converter.convert()
    with open(out_path, "wb") as f:
        f.write(tflite_model)

    size_mb = os.path.getsize(out_path) / (1024 * 1024)
    print(f"[INFO] Exported TFLite model v{version} ({size_mb:.2f} MB) → {out_path}")


if __name__ == "__main__":
    export()