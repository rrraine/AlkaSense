# AlkaSense — CNN Training & Deployment Guide

> **Project:** AlkaSense — Automated Alkali Spreading Value (ASV) Classification System
> **Stack:** TensorFlow · EfficientNet-B1 · tf-keras-vis
> **Mode:** Offline-first · Auto-trains on reconnection · Auto-trains on new data upload

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Environment Setup](#3-environment-setup)
4. [Dataset Preparation](#4-dataset-preparation)
5. [Training Pipeline](#5-training-pipeline)
6. [Offline-First Architecture](#6-offline-first-architecture)
7. [Auto-Training Triggers](#7-auto-training-triggers)
8. [Model Versioning & Serving](#8-model-versioning--serving)
9. [Grad-CAM Visualization (tf-keras-vis)](#9-grad-cam-visualization-tf-keras-vis)
10. [Android Integration (TFLite)](#10-android-integration-tflite)
11. [Monitoring & Logging](#11-monitoring--logging)
12. [Pre-Launch Checklist](#12-pre-launch-checklist)

---

## 1. Project Overview

AlkaSense automates the ASV scoring of rice grains using a CNN model trained on Petri dish images. The system is designed to:

- **Run entirely offline** on an Android device using a bundled TFLite model
- **Auto-retrain** whenever the device reconnects to the internet *and* new labeled images exist
- **Auto-retrain** whenever a researcher uploads new data to the system
- **Surface Grad-CAM heatmaps** to justify classification decisions for PhilRice researchers

### ASV Score Classes (IRRI 1–7 Scale)

| ASV Score | Grain Behavior | Gelatinization Temp (GT) Class | GT Range      | Label Index |
|-----------|----------------|-------------------------------|---------------|-------------|
| 1         | Unaffected      | HIGH                          | > 74°C        | `0`         |
| 2         | Slightly affected | HIGH                        | > 74°C        | `1`         |
| 3         | Swollen         | INTERMEDIATE                  | ~70–74°C      | `2`         |
| 4         | Partly swollen  | INTERMEDIATE                  | ~70–74°C      | `3`         |
| 5         | Fully swollen   | LOW                           | < 70°C        | `4`         |
| 6         | Disintegrated   | LOW                           | < 70°C        | `5`         |
| 7         | Fully dissolved | LOW                           | < 70°C        | `6`         |

**GT Class groupings (IRRI SES standard):**
- **HIGH GT** (>74°C) → ASV scores 1–2
- **INTERMEDIATE GT** (~70–74°C) → ASV scores 3–4
- **LOW GT** (<70°C) → ASV scores 5–7

> This is a **7-class classification problem** (one class per ASV score), not a 3-class problem. The GT class is derived post-inference via a deterministic IRRI lookup table — the CNN predicts the ASV score (1–7); the app then maps it to GT automatically.

---

## 2. Repository Structure

```
alkasense/
│
├── data/
│   ├── raw/                        # Original uploads — never modified
│   ├── organized/                  # Sorted by class after ingestion
│   │   ├── asv_1/
│   │   ├── asv_2/
│   │   ├── asv_3/
│   │   ├── asv_4/
│   │   ├── asv_5/
│   │   ├── asv_6/
│   │   └── asv_7/
│   ├── splits/                     # Train / Val / Test folders
│   │   ├── train/
│   │   ├── val/
│   │   └── test/
│   └── upload_queue/               # Staging area for new uploads
│
├── models/
│   ├── checkpoints/                # Keras .keras files per training run
│   ├── exported/                   # SavedModel format
│   └── tflite/                     # Quantized .tflite for Android
│
├── logs/
│   ├── training/                   # TensorBoard logs per run
│   └── system/                     # Connectivity & trigger events
│
├── scripts/
│   ├── prepare_dataset.py          # Ingest, sort, split
│   ├── train.py                    # Full training pipeline
│   ├── export_tflite.py            # Convert to TFLite + quantize
│   ├── watcher.py                  # File system watcher (new uploads)
│   └── sync_trigger.py             # Connectivity watcher (online event)
│
├── config/
│   └── alkasense_config.yaml       # All hyperparameters & paths
│
├── requirements.txt
└── README.md                       # ← You are here
```

---

## 3. Environment Setup

### 3.1 Requirements

```txt
# requirements.txt
tensorflow>=2.13.0
tf-keras-vis>=0.8.5
scikit-learn>=1.3.0
opencv-python>=4.8.0
Pillow>=10.0.0
pyyaml>=6.0
watchdog>=3.0.0          # File system watcher
requests>=2.31.0         # Connectivity check
tensorboard>=2.13.0
numpy>=1.24.0
```

Install with:

```bash
pip install -r requirements.txt
```

### 3.2 Configuration File

```yaml
# config/alkasense_config.yaml

dataset:
  raw_dir: "data/raw"
  organized_dir: "data/organized"
  splits_dir: "data/splits"
  upload_queue_dir: "data/upload_queue"
  classes: ["asv_1", "asv_2", "asv_3", "asv_4", "asv_5", "asv_6", "asv_7"]
  split_ratios: [0.70, 0.15, 0.15]   # train / val / test
  min_samples_per_class: 30           # warn if below this threshold
  seed: 42

model:
  architecture: "EfficientNetB1"
  input_size: [240, 240]
  num_classes: 7                      # ASV scores 1–7 (IRRI scale)
  dropout_rate: 0.3
  weights: "imagenet"

training:
  batch_size: 16
  phase1_epochs: 20                   # frozen base
  phase2_epochs: 30                   # fine-tune
  phase1_lr: 0.001
  phase2_lr: 0.00001
  early_stopping_patience: 7
  unfreeze_last_n_layers: 20

export:
  saved_model_dir: "models/exported"
  tflite_dir: "models/tflite"
  tflite_filename: "alkasense_v{version}.tflite"
  quantize: true                      # INT8 quantization for Android

logging:
  tensorboard_dir: "logs/training"
  system_log: "logs/system/events.log"

triggers:
  connectivity_check_interval_sec: 60
  connectivity_check_url: "https://www.google.com"
  auto_train_on_new_data: true
  auto_train_on_reconnect: true
  min_new_samples_to_trigger: 5       # retrain only if ≥5 new images
```

---

## 4. Dataset Preparation

### 4.1 Filename Convention

All uploaded images must follow:

```
{index} - {asv_score}.jpg
# Examples: "7 - 1.jpg", "15 - 2.jpg", "23 - 5.jpg"
# Sub-score decimals also accepted: "9 - 1.6.jpg" → maps to asv_1 folder
```

> **ASV scores are integers 1–7.** If your filenames use decimal sub-scores (e.g., `1.4`, `2.1`), the parser strips the decimal and maps to the integer class (e.g., `1.4` → `asv_1`, `2.1` → `asv_2`). Validate with PhilRice evaluators that sub-scores within the same integer class look visually distinct enough before treating them as separate classes.

> **Important:** Remove label cards (images of just the number "2" or "3" with the ASV logo). These will corrupt training.

### 4.2 Ingestion Script

```python
# scripts/prepare_dataset.py

import os, re, shutil, yaml
from pathlib import Path
from sklearn.model_selection import train_test_split

with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

RAW_DIR       = cfg["dataset"]["raw_dir"]
ORG_DIR       = cfg["dataset"]["organized_dir"]
SPLITS_DIR    = cfg["dataset"]["splits_dir"]
QUEUE_DIR     = cfg["dataset"]["upload_queue_dir"]
SEED          = cfg["dataset"]["seed"]
SPLIT_RATIOS  = cfg["dataset"]["split_ratios"]


def get_class_label(filename: str) -> str | None:
    """
    Parses filenames like '7 - 1.4.jpg' → 'asv_1'
                          '15 - 2.jpg'  → 'asv_2'
    Valid ASV scores: integers 1–7 (IRRI scale).
    Returns None for non-matching or out-of-range files.
    """
    match = re.search(r"-\s*(\d+)(?:\.\d+)?", filename)
    if match:
        asv_int = int(match.group(1))
        if 1 <= asv_int <= 7:
            return f"asv_{asv_int}"
        else:
            print(f"[WARN] ASV score {asv_int} out of valid range (1–7): {filename}")
    return None


def ingest_from_queue():
    """Move new uploads from queue into organized folders."""
    queue_path = Path(QUEUE_DIR)
    moved = 0
    for f in queue_path.glob("*"):
        if f.suffix.lower() not in {".jpg", ".jpeg", ".png"}:
            continue
        label = get_class_label(f.name)
        if label:
            dest = Path(ORG_DIR) / label
            dest.mkdir(parents=True, exist_ok=True)
            shutil.move(str(f), dest / f.name)
            moved += 1
        else:
            print(f"[WARN] Skipping unrecognized file: {f.name}")
    print(f"[INFO] Ingested {moved} new images from queue.")
    return moved


def ingest_from_raw():
    """One-time sort of all raw images into organized folders."""
    for fname in os.listdir(RAW_DIR):
        if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        label = get_class_label(fname)
        if label:
            dest = Path(ORG_DIR) / label
            dest.mkdir(parents=True, exist_ok=True)
            shutil.copy(os.path.join(RAW_DIR, fname), dest / fname)


def build_splits():
    """Rebuild train/val/test splits from organized folder."""
    train_r, val_r, test_r = SPLIT_RATIOS
    for class_dir in Path(ORG_DIR).iterdir():
        if not class_dir.is_dir():
            continue
        images = list(class_dir.glob("*"))
        if len(images) < 3:
            print(f"[WARN] {class_dir.name} has only {len(images)} images — skipping split.")
            continue

        train, temp = train_test_split(images, test_size=(1 - train_r), random_state=SEED)
        val_frac = val_r / (val_r + test_r)
        val, test = train_test_split(temp, test_size=(1 - val_frac), random_state=SEED)

        for split_name, split_files in [("train", train), ("val", val), ("test", test)]:
            dest = Path(SPLITS_DIR) / split_name / class_dir.name
            dest.mkdir(parents=True, exist_ok=True)
            # Clear old split files for this class before rebuilding
            for old in dest.glob("*"):
                old.unlink()
            for img in split_files:
                shutil.copy(img, dest / img.name)

    print("[INFO] Dataset splits rebuilt.")


def check_class_balance():
    """Print class distribution and warn on imbalance."""
    print("\n[INFO] Class distribution:")
    counts = {}
    for class_dir in Path(ORG_DIR).iterdir():
        if class_dir.is_dir():
            n = len(list(class_dir.glob("*")))
            counts[class_dir.name] = n
            flag = " ⚠️ LOW" if n < cfg["dataset"]["min_samples_per_class"] else ""
            print(f"  {class_dir.name}: {n} images{flag}")
    return counts


if __name__ == "__main__":
    ingest_from_raw()
    check_class_balance()
    build_splits()
```

Run once for initial setup:

```bash
python scripts/prepare_dataset.py
```

---

## 5. Training Pipeline

### 5.1 Full Training Script

```python
# scripts/train.py

import os, yaml, datetime
import tensorflow as tf
from pathlib import Path

with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

IMG_SIZE    = tuple(cfg["model"]["input_size"])
BATCH_SIZE  = cfg["training"]["batch_size"]
NUM_CLASSES = cfg["model"]["num_classes"]   # 7 — one per ASV score (IRRI 1–7)
AUTOTUNE    = tf.data.AUTOTUNE

# ── Data augmentation (training only) ──────────────────────────────────────

augmentation = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal_and_vertical"),
    tf.keras.layers.RandomRotation(0.15),
    tf.keras.layers.RandomZoom(0.10),
    tf.keras.layers.RandomBrightness(0.10),
    tf.keras.layers.RandomContrast(0.10),
], name="augmentation")


def load_split(split: str, augment: bool = False):
    ds = tf.keras.utils.image_dataset_from_directory(
        f"{cfg['dataset']['splits_dir']}/{split}",
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
        shuffle=(split == "train"),
        seed=cfg["dataset"]["seed"],
    )
    # Normalize to [0, 1] for EfficientNet
    ds = ds.map(lambda x, y: (tf.cast(x, tf.float32) / 255.0, y),
                num_parallel_calls=AUTOTUNE)
    if augment:
        ds = ds.map(lambda x, y: (augmentation(x, training=True), y),
                    num_parallel_calls=AUTOTUNE)
    return ds.cache().prefetch(AUTOTUNE)


def compute_class_weights(splits_dir: str) -> dict:
    """Compute inverse-frequency class weights to handle imbalance."""
    counts = []
    for cls in sorted(os.listdir(f"{splits_dir}/train")):
        n = len(list(Path(f"{splits_dir}/train/{cls}").glob("*")))
        counts.append(n)
    total = sum(counts)
    weights = {i: total / (NUM_CLASSES * c) for i, c in enumerate(counts)}
    print(f"[INFO] Class weights: {weights}")
    return weights


def build_model() -> tf.keras.Model:
    base = tf.keras.applications.EfficientNetB1(
        include_top=False,
        weights=cfg["model"]["weights"],
        input_shape=(*IMG_SIZE, 3),
    )
    base.trainable = False

    inputs  = tf.keras.Input(shape=(*IMG_SIZE, 3), name="input_image")
    x       = base(inputs, training=False)
    x       = tf.keras.layers.GlobalAveragePooling2D()(x)
    x       = tf.keras.layers.Dropout(cfg["model"]["dropout_rate"])(x)
    outputs = tf.keras.layers.Dense(NUM_CLASSES, activation="softmax", name="asv_score")(x)

    return tf.keras.Model(inputs, outputs, name="AlkaSense_EfficientNetB1")


# ── IRRI GT Lookup (deterministic, post-inference) ─────────────────────────

GT_LOOKUP = {
    1: {"gt_class": "HIGH",         "range": "> 74°C",    "color": "#2E75B6"},
    2: {"gt_class": "HIGH",         "range": "> 74°C",    "color": "#2E75B6"},
    3: {"gt_class": "INTERMEDIATE", "range": "~70–74°C",  "color": "#F4B942"},
    4: {"gt_class": "INTERMEDIATE", "range": "~70–74°C",  "color": "#F4B942"},
    5: {"gt_class": "LOW",          "range": "< 70°C",    "color": "#70AD47"},
    6: {"gt_class": "LOW",          "range": "< 70°C",    "color": "#70AD47"},
    7: {"gt_class": "LOW",          "range": "< 70°C",    "color": "#70AD47"},
}

def get_gt_class(asv_score: int) -> dict:
    """Map predicted ASV score (1–7) to GT class via IRRI SES standard."""
    return GT_LOOKUP.get(asv_score, {"gt_class": "UNKNOWN", "range": "N/A", "color": "#999999"})


def get_callbacks(run_tag: str, phase: int) -> list:
    ckpt_path = f"models/checkpoints/run_{run_tag}_phase{phase}.keras"
    return [
        tf.keras.callbacks.ModelCheckpoint(
            ckpt_path, save_best_only=True, monitor="val_accuracy", verbose=1
        ),
        tf.keras.callbacks.EarlyStopping(
            patience=cfg["training"]["early_stopping_patience"],
            restore_best_weights=True,
            monitor="val_accuracy",
        ),
        tf.keras.callbacks.TensorBoard(
            log_dir=f"{cfg['logging']['tensorboard_dir']}/run_{run_tag}_phase{phase}",
            histogram_freq=1,
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=3, verbose=1
        ),
    ]


def train():
    run_tag = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    print(f"\n[INFO] Starting training run: {run_tag}")

    train_ds = load_split("train", augment=True)
    val_ds   = load_split("val")
    test_ds  = load_split("test")

    class_weights = compute_class_weights(cfg["dataset"]["splits_dir"])

    model = build_model()
    model.summary()

    # ── Phase 1: Train classifier head (frozen base) ─────────────────────
    print("\n[PHASE 1] Training classifier head...")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(cfg["training"]["phase1_lr"]),
        loss="categorical_crossentropy",
        metrics=["accuracy",
                 tf.keras.metrics.AUC(name="auc"),
                 tf.keras.metrics.Precision(name="precision"),
                 tf.keras.metrics.Recall(name="recall")],
    )
    model.fit(
        train_ds, validation_data=val_ds,
        epochs=cfg["training"]["phase1_epochs"],
        class_weight=class_weights,
        callbacks=get_callbacks(run_tag, phase=1),
    )

    # ── Phase 2: Fine-tune top N layers of EfficientNet ──────────────────
    print("\n[PHASE 2] Fine-tuning EfficientNetB1...")
    base_model = model.layers[1]
    base_model.trainable = True
    n_freeze = len(base_model.layers) - cfg["training"]["unfreeze_last_n_layers"]
    for layer in base_model.layers[:n_freeze]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(cfg["training"]["phase2_lr"]),
        loss="categorical_crossentropy",
        metrics=["accuracy",
                 tf.keras.metrics.AUC(name="auc"),
                 tf.keras.metrics.Precision(name="precision"),
                 tf.keras.metrics.Recall(name="recall")],
    )
    model.fit(
        train_ds, validation_data=val_ds,
        epochs=cfg["training"]["phase2_epochs"],
        class_weight=class_weights,
        callbacks=get_callbacks(run_tag, phase=2),
    )

    # ── Evaluate ──────────────────────────────────────────────────────────
    print("\n[INFO] Evaluating on test set...")
    results = model.evaluate(test_ds, return_dict=True)
    for k, v in results.items():
        print(f"  {k}: {v:.4f}")

    # ── Export ───────────────────────────────────────────────────────────
    model.save(f"{cfg['export']['saved_model_dir']}/alkasense_{run_tag}")
    print(f"[INFO] SavedModel exported → models/exported/alkasense_{run_tag}")

    return model, run_tag


if __name__ == "__main__":
    train()
```

---

## 6. Offline-First Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ANDROID DEVICE                          │
│                                                                 │
│  ┌──────────────┐   Image   ┌────────────────────────────────┐ │
│  │  Camera /    │──────────▶│   AlkaSense App                │ │
│  │  Gallery     │           │                                │ │
│  └──────────────┘           │  ┌──────────────────────────┐  │ │
│                             │  │  Bundled .tflite model   │  │ │
│                             │  │  (no internet needed)    │  │ │
│                             │  └──────────────────────────┘  │ │
│                             │           │                     │ │
│                             │    ASV Class + Confidence       │ │
│                             │    + Grad-CAM heatmap           │ │
│                             │                                │ │
│                             │  ┌──────────────────────────┐  │ │
│                             │  │  Local SQLite log        │  │ │
│                             │  │  (queues new labels)     │  │ │
│                             │  └──────────────────────────┘  │ │
│                             └────────────────────────────────┘ │
│                                          │                      │
│                         ONLINE?          │                      │
│                              ▼           ▼                      │
│                         ┌───────────────────┐                  │
│                         │  Sync new data to │                  │
│                         │  upload_queue/    │                  │
│                         │  → triggers retrain│                 │
│                         └───────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

The `.tflite` model file is **bundled inside the APK** at build time. When a new model is trained and exported, the APK is rebuilt and distributed (or updated via in-app update).

---

## 7. Auto-Training Triggers

Two independent triggers can initiate retraining:

### Trigger A — New Data Uploaded

```python
# scripts/watcher.py
# Watches upload_queue/ for new images and triggers training.

import time, yaml, subprocess, logging
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

logging.basicConfig(
    filename=cfg["logging"]["system_log"],
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

MIN_NEW = cfg["triggers"]["min_new_samples_to_trigger"]
QUEUE   = cfg["dataset"]["upload_queue_dir"]
pending_count = 0


class UploadHandler(FileSystemEventHandler):
    def on_created(self, event):
        global pending_count
        if event.is_directory:
            return
        ext = Path(event.src_path).suffix.lower()
        if ext in {".jpg", ".jpeg", ".png"}:
            pending_count += 1
            logging.info(f"New upload detected: {event.src_path} ({pending_count} pending)")
            if pending_count >= MIN_NEW:
                pending_count = 0
                logging.info("Threshold reached — starting auto-train pipeline.")
                subprocess.Popen(["python", "scripts/prepare_dataset.py"])
                subprocess.Popen(["python", "scripts/train.py"])
                subprocess.Popen(["python", "scripts/export_tflite.py"])


if __name__ == "__main__":
    observer = Observer()
    observer.schedule(UploadHandler(), path=QUEUE, recursive=False)
    observer.start()
    logging.info(f"File watcher started on: {QUEUE}")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
```

### Trigger B — Device/Server Reconnects to Internet

```python
# scripts/sync_trigger.py
# Polls for internet connectivity; triggers training when back online
# and new data has been staged.

import time, yaml, requests, subprocess, logging
from pathlib import Path

with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

logging.basicConfig(
    filename=cfg["logging"]["system_log"],
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

CHECK_URL      = cfg["triggers"]["connectivity_check_url"]
CHECK_INTERVAL = cfg["triggers"]["connectivity_check_interval_sec"]
QUEUE          = cfg["dataset"]["upload_queue_dir"]
MIN_NEW        = cfg["triggers"]["min_new_samples_to_trigger"]
was_offline    = False


def is_online() -> bool:
    try:
        requests.get(CHECK_URL, timeout=5)
        return True
    except requests.ConnectionError:
        return False


def queue_has_new_data() -> bool:
    queue_files = list(Path(QUEUE).glob("*.jpg")) + \
                  list(Path(QUEUE).glob("*.jpeg")) + \
                  list(Path(QUEUE).glob("*.png"))
    return len(queue_files) >= MIN_NEW


if __name__ == "__main__":
    logging.info("Connectivity watcher started.")
    while True:
        online = is_online()

        if was_offline and online:
            logging.info("Connection restored.")
            if queue_has_new_data():
                logging.info("New data found in queue — triggering auto-train pipeline.")
                subprocess.Popen(["python", "scripts/prepare_dataset.py"])
                subprocess.Popen(["python", "scripts/train.py"])
                subprocess.Popen(["python", "scripts/export_tflite.py"])
            else:
                logging.info("Back online but no new data in queue — skipping retrain.")

        was_offline = not online
        time.sleep(CHECK_INTERVAL)
```

### Running Both Watchers

Start both as background processes (use `screen`, `tmux`, or a process manager like `supervisord`):

```bash
# Option A: Run directly (development)
python scripts/watcher.py &
python scripts/sync_trigger.py &

# Option B: supervisord (production)
# supervisord.conf — add both scripts as [program:x] entries
```

---

## 8. Model Versioning & Serving

### 8.1 TFLite Export Script

```python
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
```

### 8.2 Version Log

After each export, append to `models/tflite/VERSION_LOG.txt`:

```
v1 | 2025-07-01 | 52 samples | acc=0.867 | auc=0.941
v2 | 2025-08-15 | 89 samples | acc=0.912 | auc=0.965
```

---

## 9. Grad-CAM Visualization (tf-keras-vis)

Used in the Android app to show researchers **which part of the Petri dish** drove the classification.

```python
# Usage example: generate Grad-CAM for a single image

import numpy as np
import tensorflow as tf
from tf_keras_vis.gradcam_plus_plus import GradcamPlusPlus
from tf_keras_vis.utils.model_modifiers import ReplaceToLinear
from tf_keras_vis.utils.scores import CategoricalScore
import matplotlib.pyplot as plt
import cv2

IMG_SIZE = (240, 240)

def load_image(path: str) -> np.ndarray:
    img = tf.keras.utils.load_img(path, target_size=IMG_SIZE)
    arr = tf.keras.utils.img_to_array(img) / 255.0
    return np.expand_dims(arr, axis=0)   # (1, 240, 240, 3)


def generate_gradcam(model_path: str, image_path: str, class_index: int):
    model = tf.keras.models.load_model(model_path)

    gradcam = GradcamPlusPlus(
        model,
        model_modifier=ReplaceToLinear(),
        clone=True
    )

    image    = load_image(image_path)
    score    = CategoricalScore([class_index])
    cam_map  = gradcam(score, image, penultimate_layer=-1)  # last conv layer

    # Overlay on original image
    heatmap  = np.uint8(255 * cam_map[0])
    heatmap  = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    original = np.uint8(255 * image[0])
    overlay  = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)

    plt.figure(figsize=(10, 4))
    plt.subplot(1, 3, 1); plt.imshow(original);  plt.title("Original");  plt.axis("off")
    plt.subplot(1, 3, 2); plt.imshow(heatmap);   plt.title("Grad-CAM++"); plt.axis("off")
    plt.subplot(1, 3, 3); plt.imshow(overlay);   plt.title("Overlay");   plt.axis("off")
    plt.tight_layout()
    plt.savefig("gradcam_output.png", dpi=150)
    plt.show()

    return cam_map
```

---

## 10. Android Integration (TFLite)

### 10.1 Copy Model to Assets

Place the latest `.tflite` file in:

```
android/app/src/main/assets/alkasense_v{n}.tflite
```

### 10.2 Inference (Kotlin Snippet)

```kotlin
// AlkaSenseClassifier.kt

class AlkaSenseClassifier(private val context: Context) {

    private val interpreter: Interpreter by lazy {
        val model = loadModelFile("alkasense_v1.tflite")
        Interpreter(model)
    }

    private val labels = listOf(
        "ASV 1 — HIGH GT (>74°C)",
        "ASV 2 — HIGH GT (>74°C)",
        "ASV 3 — INTERMEDIATE GT (~70–74°C)",
        "ASV 4 — INTERMEDIATE GT (~70–74°C)",
        "ASV 5 — LOW GT (<70°C)",
        "ASV 6 — LOW GT (<70°C)",
        "ASV 7 — LOW GT (<70°C)"
    )

    // GT lookup for post-inference mapping
    private val gtClass = mapOf(
        0 to "HIGH", 1 to "HIGH",
        2 to "INTERMEDIATE", 3 to "INTERMEDIATE",
        4 to "LOW", 5 to "LOW", 6 to "LOW"
    )

    fun classify(bitmap: Bitmap): Triple<String, String, Float> {
        val resized  = Bitmap.createScaledBitmap(bitmap, 240, 240, true)
        val input    = TensorImage.fromBitmap(resized)
        val output   = TensorBuffer.createFixedSize(intArrayOf(1, 7), DataType.FLOAT32)

        interpreter.run(input.buffer, output.buffer.rewind())

        val scores     = output.floatArray
        val maxIdx     = scores.indices.maxByOrNull { scores[it] }!!
        val confidence = scores[maxIdx]
        val asvScore   = labels[maxIdx]
        val gt         = gtClass[maxIdx] ?: "UNKNOWN"

        return Triple(asvScore, gt, confidence)
    }

    private fun loadModelFile(filename: String): MappedByteBuffer {
        val fd          = context.assets.openFd(filename)
        val inputStream = FileInputStream(fd.fileDescriptor)
        return inputStream.channel.map(FileChannel.MapMode.READ_ONLY, fd.startOffset, fd.declaredLength)
    }
}
```

### 10.3 Offline Fallback Strategy

| Scenario | Behavior |
|---|---|
| No internet, model bundled | Inference runs locally from APK assets |
| Internet restored, new model ready | App checks version endpoint, downloads update |
| New model not yet ready | App continues using current bundled version |

---

## 11. Monitoring & Logging

### View TensorBoard

```bash
tensorboard --logdir logs/training/
# Open http://localhost:6006
```

### System Event Log

All trigger events are appended to `logs/system/events.log`:

```
2025-07-01 10:23:11 [INFO] File watcher started on: data/upload_queue
2025-07-01 10:45:02 [INFO] New upload detected: sample_024.jpg (1 pending)
2025-07-01 10:52:18 [INFO] Threshold reached — starting auto-train pipeline.
2025-07-01 11:34:55 [INFO] Connection restored.
2025-07-01 11:34:56 [INFO] New data found in queue — triggering auto-train pipeline.
```

---

## 12. Pre-Launch Checklist

### Dataset

- [ ] Raw images follow `{index} - {asv_score}.jpg` naming (ASV scores 1–7 only)
- [ ] Label card images removed (e.g., "ASV 2" graphic, "3" graphic)
- [ ] All 7 class folders (`asv_1` through `asv_7`) populated
- [ ] ≥30 images per class (≥50 recommended; aim for balance across all 7 classes)
- [ ] Class balance checked — use `class_weight` if imbalanced
- [ ] `prepare_dataset.py` run successfully; splits folder populated

### Training

- [ ] `config/alkasense_config.yaml` reviewed — `num_classes: 7` confirmed
- [ ] Phase 1 converges before Phase 2 begins
- [ ] Val accuracy ≥ 0.85 per class (project SMART objective)
- [ ] Cohen's Kappa ≥ 0.75 (project benchmark)
- [ ] GT lookup `GT_LOOKUP` dict verified against IRRI SES standard

### Export

- [ ] SavedModel exported to `models/exported/`
- [ ] TFLite converted with INT8 quantization
- [ ] TFLite model tested on device with sample images
- [ ] `VERSION_LOG.txt` updated

### Automation

- [ ] `watcher.py` running and watching `upload_queue/`
- [ ] `sync_trigger.py` running and connectivity interval set
- [ ] `upload_queue/` directory exists and is writable
- [ ] Test: drop 5+ images into `upload_queue/` → verify pipeline fires

### Android

- [ ] `.tflite` model placed in `assets/`
- [ ] Inference tested offline (airplane mode)
- [ ] Output returns ASV score (1–7), GT class, and confidence correctly
- [ ] GT class display uses correct color codes: HIGH=#2E75B6, INTERMEDIATE=#F4B942, LOW=#70AD47
- [ ] Grad-CAM output renders correctly in the results screen
- [ ] Version number displayed in app settings

---

*Last updated: 2026 · AlkaSense · Cebu Institute of Technology – University × PhilRice*
