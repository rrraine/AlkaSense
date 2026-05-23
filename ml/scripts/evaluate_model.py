# scripts/evaluate_model.py
# Runs evaluation on entire test split and shows per-class results

import os, glob, yaml, argparse
import numpy as np
import tensorflow as tf
from pathlib import Path
from sklearn.metrics import classification_report, confusion_matrix

# ── Args ──────────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser()
parser.add_argument("--model", type=str, default=None,
                    help="Specific model folder name, e.g. alkasense_20260523_161638")
args = parser.parse_args()

# ── Config ────────────────────────────────────────────────────────────────────
with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

IMG_SIZE   = (240, 240)
SPLITS_DIR = cfg["dataset"]["splits_dir"]
GT_CLASSES = ["gt_high", "gt_intermediate", "gt_low"]

# IRRI standard: ASV 1-2 → high GT, ASV 3-5 → intermediate GT, ASV 6-7 → low GT
# Model output indices: 0=asv_1, 1=asv_2, ..., 6=asv_7
ASV_TO_GT = {
    0: 0,  # asv_1 → gt_high
    1: 0,  # asv_2 → gt_high
    2: 1,  # asv_3 → gt_intermediate
    3: 1,  # asv_4 → gt_intermediate
    4: 1,  # asv_5 → gt_intermediate
    5: 2,  # asv_6 → gt_low
    6: 2,  # asv_7 → gt_low
}

# ── Load model ────────────────────────────────────────────────────────────────
if args.model:
    model_path = os.path.join(cfg["export"]["saved_model_dir"], args.model)
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}")
else:
    models = sorted(glob.glob(f"{cfg['export']['saved_model_dir']}/alkasense_*"))
    if not models:
        raise FileNotFoundError("No exported models found. Run train.py first.")
    model_path = models[-1]

print(f"[INFO] Loading: {model_path}")
model = tf.keras.models.load_model(model_path)

# ── Collect images in batches ─────────────────────────────────────────────────
y_true, y_pred = [], []
batch_imgs, batch_labels = [], []
BATCH_SIZE = 32

def run_batch(imgs, labels):
    arr = np.stack(imgs, axis=0)
    preds = model.predict(arr, verbose=0)
    for label, pred in zip(labels, preds):
        asv_idx = int(np.argmax(pred))
        gt_idx  = ASV_TO_GT[asv_idx]
        y_true.append(label)
        y_pred.append(gt_idx)

for class_idx, class_name in enumerate(GT_CLASSES):
    class_dir = Path(SPLITS_DIR) / "test" / class_name
    if not class_dir.exists():
        print(f"[WARN] Missing: {class_dir}")
        continue

    images = (list(class_dir.glob("*.png")) +
              list(class_dir.glob("*.jpg")) +
              list(class_dir.glob("*.jpeg")))

    if not images:
        print(f"[WARN] No images in: {class_dir}")
        continue

    print(f"[INFO] {class_name}: {len(images)} images")

    for img_path in images:
        img = tf.keras.utils.load_img(img_path, target_size=IMG_SIZE)
        arr = tf.keras.applications.mobilenet_v2.preprocess_input(
                  tf.keras.utils.img_to_array(img))
        batch_imgs.append(arr)
        batch_labels.append(class_idx)

        if len(batch_imgs) == BATCH_SIZE:
            run_batch(batch_imgs, batch_labels)
            batch_imgs.clear()
            batch_labels.clear()

if batch_imgs:  # flush remaining
    run_batch(batch_imgs, batch_labels)

# ── Results ───────────────────────────────────────────────────────────────────
if not y_true:
    print("[ERROR] No images were evaluated. Check your splits_dir in config.")
else:
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    print("\n" + "=" * 50)
    print("TEST SET EVALUATION")
    print(f"Model: {os.path.basename(model_path)}")
    print("=" * 50)
    print(f"Total test images : {len(y_true)}")
    print(f"Overall accuracy  : {np.mean(y_true == y_pred):.1%}\n")

    print("Per-class report:")
    print(classification_report(y_true, y_pred,
                                labels=[0, 1, 2],
                                target_names=GT_CLASSES,
                                zero_division=0))

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2])
    print("Confusion matrix (rows=actual, cols=predicted):")
    print(f"{'':18}", "  ".join(f"{c:>14}" for c in GT_CLASSES))
    for i, row in enumerate(cm):
        print(f"{GT_CLASSES[i]:18}", "  ".join(f"{v:>14}" for v in row))

    print("\nNormalized confusion matrix (% of actual):")
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True).clip(min=1)
    print(f"{'':18}", "  ".join(f"{c:>14}" for c in GT_CLASSES))
    for i, row in enumerate(cm_norm):
        print(f"{GT_CLASSES[i]:18}", "  ".join(f"{v:>13.1%}" for v in row))