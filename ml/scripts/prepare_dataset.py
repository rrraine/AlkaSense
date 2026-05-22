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