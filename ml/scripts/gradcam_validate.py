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