# scripts/explain.py

#kadyot sa, maybe this one will change

import anthropic
import base64
import cv2
import numpy as np

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


def encode_image_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


def build_prompt(asv_score: int, confidence: float,
                 adjacent_scores: dict) -> str:
    gt_class       = ASV_TO_GT[asv_score]
    gt_range, gt_cook = GT_DESCRIPTIONS[gt_class]
    asv_below      = asv_score - 1
    asv_above      = asv_score + 1
    conf_below     = adjacent_scores.get(asv_below, 0.0)
    conf_above     = adjacent_scores.get(asv_above, 0.0)

    return f"""You are an expert rice quality evaluator at PhilRice trained in the IRRI Alkali Spreading Value (ASV) test protocol.

A CNN model analyzed a rice grain image after 23-hour KOH (potassium hydroxide) treatment and produced the following result:

- Predicted ASV Score: {asv_score} out of 7
- Grain behavior at this score: {ASV_DESCRIPTIONS[asv_score]}
- Model confidence: {confidence:.1%}
- Confidence for ASV {asv_below} (one below): {conf_below:.1%}
- Confidence for ASV {asv_above} (one above): {conf_above:.1%}
- Gelatinization Temperature class: {gt_class} ({gt_range})
- Cooking implication: {gt_cook}

A Grad-CAM heatmap image is attached showing which regions of the grain influenced this classification most (red/warm = high influence, blue/cool = low influence).

Write a concise explanation (3–4 sentences) for a PhilRice rice breeder that:
1. Describes what the grain visually looks like based on the ASV score and heatmap
2. Explains why this is ASV {asv_score} and not ASV {asv_below} or ASV {asv_above}
3. States what the {gt_class} gelatinization temperature means for this variety's cooking quality

Use plain language. Do not use jargon beyond ASV and GT. Do not mention the CNN or model internals."""


def get_ai_explanation(image_path: str, asv_score: int,
                       confidence: float, all_scores: list[float]) -> str:
    """
    Calls Claude API with the Grad-CAM overlay image + structured prompt.
    Returns plain-language explanation string.

    Falls back to template string if API is unavailable (offline).
    """
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from env

    # Build adjacent score confidence map
    adjacent = {
        i + 1: float(all_scores[i])
        for i in range(len(all_scores))
        if abs((i + 1) - asv_score) == 1
    }

    prompt  = build_prompt(asv_score, confidence, adjacent)
    img_b64 = encode_image_base64(image_path)   # pass Grad-CAM overlay

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": img_b64,
                        },
                    },
                    {"type": "text", "text": prompt}
                ],
            }]
        )
        return message.content[0].text

    except Exception:
        # Offline fallback — template-based explanation
        return _offline_fallback(asv_score, confidence)


def _offline_fallback(asv_score: int, confidence: float) -> str:
    """Template explanation when Claude API is unreachable."""
    gt_class       = ASV_TO_GT[asv_score]
    gt_range, gt_cook = GT_DESCRIPTIONS[gt_class]
    return (
        f"The grain was classified as ASV {asv_score} "
        f"({ASV_DESCRIPTIONS[asv_score]}) with {confidence:.1%} confidence. "
        f"This corresponds to a {gt_class} gelatinization temperature "
        f"({gt_range}), meaning this variety {gt_cook}. "
        f"Connect to the internet for a detailed AI-generated explanation."
    )