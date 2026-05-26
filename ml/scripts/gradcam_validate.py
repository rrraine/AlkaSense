# Usage example: generate Grad-CAM for a single image
# gradcam_validate.py — matches explain_router.py implementation (no tf_keras_vis)

import numpy as np
import tensorflow as tf
import cv2
import matplotlib.pyplot as plt

IMG_SIZE = (240, 240)

def load_image(path: str) -> np.ndarray:
    img = tf.keras.utils.load_img(path, target_size=IMG_SIZE)
    arr = tf.keras.utils.img_to_array(img)
    # MobileNetV2 preprocessing (matches train.py)
    arr = tf.keras.applications.mobilenet_v2.preprocess_input(arr)
    return np.expand_dims(arr, axis=0)  # (1, 240, 240, 3)

def find_last_conv_layer(model: tf.keras.Model) -> str:
    for layer in reversed(model.layers):
        if isinstance(layer, tf.keras.layers.Conv2D):
            return layer.name
    raise ValueError("No Conv2D layer found in model")

def generate_gradcam(model_path: str, image_path: str, class_index: int):
    model = tf.keras.models.load_model(model_path)
    
    last_conv = find_last_conv_layer(model)
    print(f"[INFO] Using layer: {last_conv}")

    grad_model = tf.keras.Model(
        inputs=model.input,
        outputs=[model.get_layer(last_conv).output, model.output]
    )

    image = load_image(image_path)
    image_tensor = tf.cast(image, tf.float32)

    with tf.GradientTape() as tape:
        tape.watch(image_tensor)
        conv_outputs, predictions = grad_model(image_tensor)
        loss = predictions[:, class_index]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
    heatmap = heatmap.numpy()

    # Resize and colorize
    heatmap_resized = cv2.resize(heatmap, IMG_SIZE)
    heatmap_colored = cv2.applyColorMap(np.uint8(255 * heatmap_resized), cv2.COLORMAP_JET)
    heatmap_colored = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

    # Original image denormalized for display
    original_display = np.uint8(((image[0] + 1) / 2) * 255)  # undo MobileNetV2 preprocess

    overlay = cv2.addWeighted(original_display, 0.6, heatmap_colored, 0.4, 0)

    plt.figure(figsize=(10, 4))
    plt.subplot(1, 3, 1); plt.imshow(original_display); plt.title("Original");   plt.axis("off")
    plt.subplot(1, 3, 2); plt.imshow(heatmap_colored);  plt.title("Grad-CAM++"); plt.axis("off")
    plt.subplot(1, 3, 3); plt.imshow(overlay);          plt.title("Overlay");    plt.axis("off")
    plt.tight_layout()
    plt.savefig("gradcam_output.png", dpi=150)
    plt.show()

    print(f"[INFO] Predicted class probabilities: {tf.nn.softmax(predictions[0]).numpy()}")
    return heatmap

'''
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
'''