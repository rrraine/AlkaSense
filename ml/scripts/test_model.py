# scripts/test_model.py
# Tests the trained model on a single image
# Usage: python scripts/test_model.py path/to/your/image.jpg

import sys
import numpy as np
import tensorflow as tf

# ── Config ────────────────────────────────────────────────────────────────
IMG_SIZE   = (224, 224)
MODEL_PATH = "models/exported"   # points to latest SavedModel
GT_CLASSES = {
    0: ("HIGH GT",         "> 74°C",   "takes longer to cook, firmer texture"),
    1: ("INTERMEDIATE GT", "~70-74°C", "moderate cooking time, balanced texture"),
    2: ("LOW GT",          "< 70°C",   "cooks quickly, softer texture"),
}

# ── Load model ────────────────────────────────────────────────────────────
import glob, os
models = sorted(glob.glob(f"{MODEL_PATH}/alkasense_*"))
if not models:
    print("ERROR: No trained model found. Run train.py first.")
    sys.exit(1)

latest = models[-1]
print(f"[INFO] Loading model: {latest}")
model = tf.keras.models.load_model(latest)

# ── Load and preprocess image ─────────────────────────────────────────────
image_path = sys.argv[1] if len(sys.argv) > 1 else None
if not image_path:
    print("Usage: python scripts/test_model.py path/to/image.jpg")
    sys.exit(1)

img = tf.keras.utils.load_img(image_path, target_size=IMG_SIZE)
arr = tf.keras.utils.img_to_array(img)
arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
arr = np.expand_dims(arr, axis=0)   # shape: (1, 224, 224, 3)

# ── Run inference ─────────────────────────────────────────────────────────
predictions = model.predict(arr, verbose=0)[0]   # shape: (3,)
class_idx   = int(np.argmax(predictions))
confidence  = float(predictions[class_idx])

# ── Print results ─────────────────────────────────────────────────────────
print("\n" + "="*50)
print("ALKASENSE PREDICTION RESULT")
print("="*50)
print(f"Image:       {image_path}")
print(f"GT Class:    {GT_CLASSES[class_idx][0]}")
print(f"Temp Range:  {GT_CLASSES[class_idx][1]}")
print(f"Cooking:     {GT_CLASSES[class_idx][2]}")
print(f"Confidence:  {confidence:.1%}")
print()
print("All class probabilities:")
for i, (name, temp, _) in GT_CLASSES.items():
    bar = "█" * int(predictions[i] * 30)
    print(f"  {name:<20} {predictions[i]:.1%}  {bar}")
print("="*50)