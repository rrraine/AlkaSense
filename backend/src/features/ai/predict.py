from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import numpy as np
from PIL import Image
import io
import os
import tensorflow as tf

router = APIRouter()

# Load model once at startup
interpreter = None

def get_interpreter():
    global interpreter
    if interpreter is None:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # src/features/ai/
        MODEL_PATH = os.path.join(BASE_DIR, "..", "..", "..", "assets", "alkasense.tflite")
        MODEL_PATH = os.path.normpath(MODEL_PATH)
        interpreter = tf.lite.Interpreter(model_path=MODEL_PATH)
        interpreter.allocate_tensors()
    return interpreter

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = img.resize((240, 240))
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)

def score_to_gt_class(score: int) -> str:
    if score <= 2:
        return "High GT (>74°C)"
    elif score <= 5:
        return "Intermediate GT (70-74°C)"
    else:
        return "Low GT (<70°C)"

@router.post("/predict")
async def predict(
    image: UploadFile = File(...),
    spreading_pattern: str = Form(None),
    grain_translucency: str = Form(None),
    score_uniformity: str = Form(None),
    anomaly_flags: str = Form(None),
    koh_solution: str = Form(None),
):
    try:
        image_bytes = await image.read()
        input_data = preprocess_image(image_bytes)

        interp = get_interpreter()
        input_details = interp.get_input_details()
        output_details = interp.get_output_details()

        interp.set_tensor(input_details[0]['index'], input_data)
        interp.invoke()

        output = interp.get_tensor(output_details[0]['index'])[0]

        # output shape: [7] → one probability per ASV score 1–7
        predicted_index = int(np.argmax(output))
        predicted_asv_score = predicted_index + 1  # 0-indexed → 1-indexed
        raw_confidence = round(float(output[predicted_index]) * 100, 2)

        # Calibration: slightly penalize low confidence
        calibrated_certainty = round(raw_confidence * 0.85, 2)

        has_confidence_warning = raw_confidence < 75.0
        has_observation_conflict = False
        conflict_dimensions = []

        # Basic conflict detection
        if spreading_pattern and predicted_asv_score >= 6 and "tight" in spreading_pattern.lower():
            has_observation_conflict = True
            conflict_dimensions.append("Spreading Pattern Texture")

        if grain_translucency and predicted_asv_score <= 2 and "translucent" in grain_translucency.lower():
            has_observation_conflict = True
            conflict_dimensions.append("Grain Translucency")

        return JSONResponse({
            "predicted_asv_score": predicted_asv_score,
            "predicted_gt_class": score_to_gt_class(predicted_asv_score),
            "raw_confidence": raw_confidence,
            "calibrated_certainty": calibrated_certainty,
            "hasConfidenceWarning": has_confidence_warning,
            "hasObservationConflict": has_observation_conflict,
            "conflictDimensions": conflict_dimensions,
            "overlay_file_path": None,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()  # prints full error to uvicorn terminal
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")