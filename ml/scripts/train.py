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
    tf.keras.layers.RandomRotation(1.0),          # full 360 — dish is circular
    tf.keras.layers.RandomZoom((-0.2, 0.2)),      # zoom in AND out
    tf.keras.layers.RandomBrightness(0.4),        # strong lighting variation
    tf.keras.layers.RandomContrast(0.4),          # strong contrast variation
    tf.keras.layers.RandomTranslation(0.1, 0.1), # slight position shifts
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
    ds = ds.map(lambda x, y: (tf.keras.applications.mobilenet_v2.preprocess_input(x), y),
                num_parallel_calls=AUTOTUNE)
    if augment:
        ds = ds.map(lambda x, y: (augmentation(x, training=True), y),
                    num_parallel_calls=AUTOTUNE)
        ds = ds.repeat(10)   # each epoch sees data 10x with different augmentations
        ds = ds.shuffle(200)  # reshuffle after repeat
    return ds.prefetch(AUTOTUNE)


def compute_class_weights(splits_dir: str) -> dict:
    """Compute inverse-frequency class weights to handle imbalance."""
    counts = []
    for cls in sorted(os.listdir(f"{splits_dir}/train")):
        cls_path = Path(f"{splits_dir}/train/{cls}")
        if not cls_path.is_dir():
            continue
        n = len(list(cls_path.glob("*")))
        if n == 0:
            print(f"[WARN] Empty train folder for class: {cls} — skipping weight")
            n = 1  # prevent division by zero
        counts.append(n)
        print(f"[INFO] Train count for {cls}: {n}")
    total = sum(counts)
    weights = {i: total / (NUM_CLASSES * c) for i, c in enumerate(counts)}
    print(f"[INFO] Class weights: {weights}")
    return weights

def build_model() -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(
        include_top=False,
        weights="imagenet",
        input_shape=(*IMG_SIZE, 3),
    )
    base.trainable = False

    inputs  = tf.keras.Input(shape=(*IMG_SIZE, 3), name="input_image")
    x       = base(inputs, training=False)
    x       = tf.keras.layers.GlobalAveragePooling2D()(x)
    x       = tf.keras.layers.Dropout(0.5)(x)   # higher dropout for small data
    outputs = tf.keras.layers.Dense(NUM_CLASSES, activation="softmax", name="asv_score")(x)

    return tf.keras.Model(inputs, outputs, name="AlkaSense_MobileNetV2")

#def build_model() -> tf.keras.Model:
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
    ckpt_path = f"models/checkpoints/run_{run_tag}_phase{phase}.h5"
    return [
        tf.keras.callbacks.ModelCheckpoint(
            ckpt_path, save_best_only=True, monitor="val_accuracy", verbose=1,
            save_weights_only=False, options=None
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