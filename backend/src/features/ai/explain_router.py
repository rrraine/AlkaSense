import base64
import glob
import io
import json
import os
import tempfile

import cv2
import numpy as np
from fastapi import APIRouter, Form, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from google import genai
from google.genai import types
from PIL import Image

router = APIRouter()

ASV_DESCRIPTIONS = {
    1: "unaffected — grain remains completely intact with no spreading",
    2: "slightly affected — minimal softening at grain edges, core intact",
    3: "swollen — grain has visibly expanded, edges beginning to soften",
    4: "partly swollen — grain expanded with moderate spreading at edges",
    5: "fully swollen with frayed edges — grain significantly expanded, edges dissolved",
    6: "disintegrated — grain structure mostly broken down, fragments visible",
    7: "completely dissolved — grain fully dissolved into KOH solution",
}

GT_DESCRIPTIONS = {
    "HIGH":         ("above 74°C", "takes longer to cook, firmer texture"),
    "INTERMEDIATE": ("~70–74°C",   "moderate cooking time, balanced texture"),
    "LOW":          ("below 70°C", "cooks quickly, softer texture"),
}

ASV_TO_GT = {1: "HIGH", 2: "HIGH", 3: "INTERMEDIATE",
             4: "INTERMEDIATE", 5: "LOW", 6: "LOW", 7: "LOW"}

IMG_SIZE = (240, 240)

_keras_model = None


def _find_keras_model_path() -> str | None:
    explicit = os.getenv("KERAS_MODEL_PATH", "").strip()
    if explicit and os.path.exists(explicit):
        return explicit

    base = os.path.dirname(os.path.abspath(__file__))
    # backend/src/features/ai/ → ../../../../ml/models/exported/
    search_root = os.path.normpath(os.path.join(base, "..", "..", "..", "..", "ml", "models", "exported"))
    if os.path.isdir(search_root):
        candidates = sorted(glob.glob(os.path.join(search_root, "alkasense_*")), reverse=True)
        for c in candidates:
            if os.path.isdir(c) or c.endswith((".keras", ".h5")):
                return c
    return None


def _get_keras_model():
    global _keras_model
    if _keras_model is not None:
        return _keras_model

    try:
        import tensorflow as tf
        model_path = _find_keras_model_path()
        if model_path is None:
            return None
        _keras_model = tf.keras.models.load_model(model_path)
        return _keras_model
    except Exception as exc:
        print(f"[explain] Keras model load failed: {exc}")
        return None


def _find_last_conv_layer(model) -> str | None:
    import tensorflow as tf
    for layer in reversed(model.layers):
        if isinstance(layer, (tf.keras.layers.Conv2D, tf.keras.layers.DepthwiseConv2D)):
            return layer.name
    return None


def generate_gradcam_overlay(image_bytes: bytes, class_index: int) -> bytes | None:
    try:
        import tensorflow as tf

        model = _get_keras_model()
        if model is None:
            return None

        conv_layer_name = _find_last_conv_layer(model)
        if conv_layer_name is None:
            return None

        # Preprocess image
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img_resized = img.resize(IMG_SIZE)
        img_array = np.array(img_resized, dtype=np.float32) / 255.0
        img_tensor = np.expand_dims(img_array, axis=0)

        # Build gradient model
        grad_model = tf.keras.Model(
            inputs=model.input,
            outputs=[model.get_layer(conv_layer_name).output, model.output],
        )

        with tf.GradientTape() as tape:
            img_tf = tf.cast(img_tensor, tf.float32)
            conv_outputs, predictions = grad_model(img_tf)
            loss = predictions[:, class_index]

        grads = tape.gradient(loss, conv_outputs)
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
        conv_outputs = conv_outputs[0]
        heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap).numpy()
        heatmap = np.maximum(heatmap, 0)
        if heatmap.max() > 0:
            heatmap /= heatmap.max()

        # Resize heatmap to image size and apply JET colormap
        heatmap_uint8 = np.uint8(255 * heatmap)
        heatmap_resized = cv2.resize(heatmap_uint8, IMG_SIZE)
        heatmap_colored = cv2.applyColorMap(heatmap_resized, cv2.COLORMAP_JET)
        heatmap_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

        # Blend with original
        original_rgb = np.array(img_resized)
        overlay = cv2.addWeighted(original_rgb, 0.6, heatmap_rgb, 0.4, 0)

        # Encode as PNG bytes
        _, buf = cv2.imencode(".png", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        return buf.tobytes()

    except Exception as exc:
        print(f"[explain] GradCAM failed: {exc}")
        return None


def _build_gemini_prompt(asv_score: int, confidence: float, adjacent: dict, has_heatmap: bool) -> str:
    gt_class = ASV_TO_GT[asv_score]
    gt_range, gt_cook = GT_DESCRIPTIONS[gt_class]
    asv_below = asv_score - 1
    asv_above = asv_score + 1
    conf_below = adjacent.get(asv_below, 0.0)
    conf_above = adjacent.get(asv_above, 0.0)

    image_desc = (
        "A Grad-CAM heatmap overlay image is attached (red/warm = high model attention, blue/cool = low attention)."
        if has_heatmap else
        "The original rice grain image after KOH treatment is attached."
    )

    return f"""You are an expert rice quality evaluator at PhilRice trained in the IRRI Alkali Spreading Value (ASV) test protocol.

A CNN model analyzed a rice grain image after 23-hour KOH (potassium hydroxide) treatment and produced:

- Predicted ASV Score: {asv_score} out of 7
- Grain behavior: {ASV_DESCRIPTIONS[asv_score]}
- Model confidence: {confidence:.1%}
- Confidence for ASV {asv_below} (one below): {conf_below:.1%}
- Confidence for ASV {asv_above} (one above): {conf_above:.1%}
- Gelatinization Temperature class: {gt_class} ({gt_range})
- Cooking implication: {gt_cook}

{image_desc}

Return ONLY a valid JSON array with exactly 3 objects, each with "label" and "text" keys.
Analyze the grain image and describe exactly these 3 aspects for a PhilRice rice breeder:

1. "Edge spreading pattern" — describe visible diffusion along grain boundaries and what it means for this ASV score
2. "Center translucency" — describe opacity/translucency in grain centers and how it aligns with this classification
3. "Overall morphology" — describe grain shape retention, spreading, and what the {gt_class} GT means for cooking

Use plain language. Do not mention the CNN or model. Maximum 25 words per text value.

Example format:
[
  {{"label": "Edge spreading pattern", "text": "..."}},
  {{"label": "Center translucency", "text": "..."}},
  {{"label": "Overall morphology", "text": "..."}}
]"""


def _offline_bullets(asv_score: int, confidence: float) -> list[dict]:
    gt_class = ASV_TO_GT[asv_score]
    gt_range, gt_cook = GT_DESCRIPTIONS[gt_class]
    return [
        {"label": "Edge spreading pattern",
         "text": f"Grain edges show {ASV_DESCRIPTIONS[asv_score]}, consistent with ASV {asv_score} classification."},
        {"label": "Center translucency",
         "text": f"Core opacity aligns with {gt_class} gelatinization temperature ({gt_range})."},
        {"label": "Overall morphology",
         "text": f"Grain morphology indicates this variety {gt_cook}. Connect to internet for full AI analysis."},
    ]


def call_gemini(image_bytes: bytes, asv_score: int, confidence: float,
                all_scores: list[float], has_heatmap: bool) -> list[dict]:
    adjacent = {
        i + 1: float(all_scores[i])
        for i in range(len(all_scores))
        if abs((i + 1) - asv_score) == 1
    }

    prompt = _build_gemini_prompt(asv_score, confidence, adjacent, has_heatmap)
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")

    try:
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                {"mime_type": "image/png", "data": img_b64},
                prompt,
            ],
            config=types.GenerateContentConfig(
                max_output_tokens=400,
                temperature=0.35,
            ),
        )
        raw = response.text.strip()

        # Strip markdown code fences if Gemini wraps in ```json ... ```
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        bullets = json.loads(raw)
        if isinstance(bullets, list) and len(bullets) == 3:
            return bullets

    except Exception as exc:
        print(f"[explain] Gemini call failed: {exc}")

    return _offline_bullets(asv_score, confidence)


@router.post("/explain")
async def explain(
    image: UploadFile = File(...),
    asv_score: int = Form(...),
    calibrated_certainty: float = Form(...),
    all_scores: str = Form(...),
):
    try:
        image_bytes = await image.read()

        scores_list = [float(s) for s in all_scores.split(",")]
        class_index = asv_score - 1  # 0-indexed

        # GradCAM overlay (PNG bytes) or None if model unavailable
        overlay_bytes = generate_gradcam_overlay(image_bytes, class_index)
        has_heatmap = overlay_bytes is not None

        # Send overlay (or original image) to Gemini
        gemini_input = overlay_bytes if has_heatmap else image_bytes
        explanation_bullets = call_gemini(
            gemini_input, asv_score, calibrated_certainty / 100.0, scores_list, has_heatmap
        )

        heatmap_b64 = base64.b64encode(overlay_bytes).decode("utf-8") if has_heatmap else None

        return JSONResponse({
            "heatmap_base64": heatmap_b64,
            "heatmap_available": has_heatmap,
            "explanation_bullets": explanation_bullets,
        })

    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Explain failed: {str(exc)}")
