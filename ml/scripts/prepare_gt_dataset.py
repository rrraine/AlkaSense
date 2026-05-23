# scripts/prepare_gt_dataset.py
import os, shutil, yaml
from pathlib import Path
from sklearn.model_selection import train_test_split

with open("config/alkasense_config.yaml") as f:
    cfg = yaml.safe_load(f)

GT_MAP = {
    "asv_1": "gt_high",
    "asv_2": "gt_high",
    "asv_3": "gt_intermediate",
    "asv_4": "gt_intermediate",
    "asv_5": "gt_low",
    "asv_6": "gt_low",
    "asv_7": "gt_low",
}

SRC       = Path("alkasense_dataset/data/organized")
SPLITS    = Path("alkasense_dataset/data/splits_gt")
SEED      = cfg["dataset"]["seed"]

# Collect all images grouped by GT class
gt_images = {"gt_high": [], "gt_intermediate": [], "gt_low": []}
for asv_folder, gt_class in GT_MAP.items():
    src_path = SRC / asv_folder
    if src_path.exists():
        gt_images[gt_class].extend(list(src_path.glob("*.png")) +
                                   list(src_path.glob("*.jpg")) +
                                   list(src_path.glob("*.jpeg")))

print("\n[INFO] GT class totals:")
for cls, imgs in gt_images.items():
    print(f"  {cls}: {len(imgs)} images")

# Build splits
for gt_class, images in gt_images.items():
    if len(images) < 3:
        print(f"[WARN] {gt_class} has only {len(images)} images — skipping")
        continue

    train, temp = train_test_split(images, test_size=0.40, random_state=SEED)
    val, test   = train_test_split(temp,   test_size=0.50, random_state=SEED)

    for split_name, split_files in [("train", train), ("val", val), ("test", test)]:
        dest = SPLITS / split_name / gt_class
        dest.mkdir(parents=True, exist_ok=True)
        for old in dest.glob("*"):
            old.unlink()
        for img in split_files:
            shutil.copy(img, dest / f"{img.parent.name}_{img.name}")

print("\n[INFO] GT splits built:")
for split in ["train", "val", "test"]:
    for cls in ["gt_high", "gt_intermediate", "gt_low"]:
        n = len(list((SPLITS / split / cls).glob("*")))
        print(f"  {split}/{cls}: {n}")