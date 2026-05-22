import base64
import io
import os
from functools import lru_cache
from django.conf import settings
from django.core.files.base import ContentFile
from PIL import Image

# ═════════════════════════════════════════════════════════════════════════════
#  SECTION 1 — MASK & GEOMETRY UTILITIES  (unchanged — battle-tested)
# ═════════════════════════════════════════════════════════════════════════════

def build_mask_from_polygon(width, height, polygon_points):
    import cv2
    import numpy as np

    if not polygon_points or len(polygon_points) < 3:
        return None

    mask = np.zeros((height, width), dtype=np.uint8)
    pts = np.array(polygon_points, np.int32).reshape((-1, 1, 2))
    cv2.fillPoly(mask, [pts], 255)
    return mask


def refine_product_mask(mask):
    """Convert a noisy alpha/mask into one solid silhouette."""
    import cv2
    import numpy as np

    if mask is None:
        return None

    clean = np.where(mask > 10, 255, 0).astype(np.uint8)
    if not np.any(clean):
        return None

    kernel = np.ones((7, 7), np.uint8)
    clean = cv2.morphologyEx(clean, cv2.MORPH_CLOSE, kernel, iterations=2)
    clean = cv2.morphologyEx(clean, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8), iterations=1)

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(clean, connectivity=8)
    if num_labels <= 1:
        return clean

    height, width = clean.shape[:2]
    image_area = height * width
    center_rect = (width * 0.2, height * 0.2, width * 0.8, height * 0.8)

    mask_indices = []
    for label in range(1, num_labels):
        x, y, w, h, area = stats[label]
        cx, cy = centroids[label]
        if area < (image_area * 0.005):
            continue
        is_centered = (center_rect[0] < cx < center_rect[2]) and (center_rect[1] < cy < center_rect[3])
        if area > (image_area * 0.05) or (is_centered and area > (image_area * 0.01)):
            mask_indices.append(label)

    if not mask_indices:
        best_label = 1 + int(stats[1:, cv2.CC_STAT_AREA].argmax())
        mask_indices = [best_label]

    clean = sum(
        (labels == idx).astype("uint8") * 255
        for idx in mask_indices
    ).clip(0, 255).astype("uint8")

    contours, _ = cv2.findContours(clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return clean

    import numpy as np
    filled = np.zeros_like(clean)
    cv2.drawContours(filled, contours, -1, 255, thickness=cv2.FILLED)
    filled = cv2.morphologyEx(filled, cv2.MORPH_CLOSE, kernel, iterations=1)
    filled = cv2.GaussianBlur(filled, (3, 3), 0)
    return filled


def mask_stats(mask):
    import cv2

    if mask is None:
        return 0, 0.0, (0, 0, 0, 0)
    area = int(cv2.countNonZero(mask))
    height, width = mask.shape[:2]
    area_ratio = area / float(max(1, height * width))
    if area == 0:
        return area, area_ratio, (0, 0, 0, 0)
    return area, area_ratio, cv2.boundingRect(mask)


def is_reasonable_door_mask(mask):
    if mask is None:
        return False
    area, area_ratio, bbox = mask_stats(mask)
    if area == 0:
        return False
    _, _, bbox_width, bbox_height = bbox
    height, width = mask.shape[:2]
    height_ratio = bbox_height / float(max(1, height))
    width_ratio  = bbox_width  / float(max(1, width))
    return 0.03 <= area_ratio <= 0.95 and height_ratio >= 0.35 and width_ratio >= 0.12


def merge_candidate_masks(primary_mask, polygon_mask):
    import cv2

    primary_mask = refine_product_mask(primary_mask)
    polygon_mask = refine_product_mask(polygon_mask)
    if primary_mask is None:
        return polygon_mask
    if polygon_mask is None:
        return primary_mask
    if not is_reasonable_door_mask(polygon_mask):
        return primary_mask

    primary_area, _, _ = mask_stats(primary_mask)
    polygon_area, _, _ = mask_stats(polygon_mask)
    overlap = cv2.countNonZero(cv2.bitwise_and(primary_mask, polygon_mask))
    smaller_area = max(1, min(primary_area, polygon_area))
    if overlap / float(smaller_area) < 0.10 and polygon_area > primary_area * 2.5:
        return primary_mask
    return refine_product_mask(cv2.bitwise_or(primary_mask, polygon_mask))


def compose_rgba_from_mask(rgb_image, alpha_mask):
    import cv2

    refined_mask = refine_product_mask(alpha_mask)
    if refined_mask is None:
        return None
    img_bgr = cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR)
    b, g, r = cv2.split(img_bgr)
    return cv2.merge((b, g, r, refined_mask))


def sanitize_pixel_box(box, width, height):
    left, top, right, bottom = [int(round(v)) for v in box]
    left   = max(0, min(left,   max(0, width  - 1)))
    top    = max(0, min(top,    max(0, height - 1)))
    right  = max(left + 1, min(right,  width))
    bottom = max(top  + 1, min(bottom, height))
    return left, top, right, bottom


def box_1000_to_pixels(box_1000, width, height):
    ymin, xmin, ymax, xmax = box_1000
    return sanitize_pixel_box(
        (xmin * width / 1000.0, ymin * height / 1000.0,
         xmax * width / 1000.0, ymax * height / 1000.0),
        width, height,
    )


def pixels_to_box_1000(pixel_box, width, height):
    left, top, right, bottom = sanitize_pixel_box(pixel_box, width, height)
    return [
        int(round(top    * 1000.0 / max(1, height))),
        int(round(left   * 1000.0 / max(1, width))),
        int(round(bottom * 1000.0 / max(1, height))),
        int(round(right  * 1000.0 / max(1, width))),
    ]


def expand_pixel_box(pixel_box, width, height, pad_x_ratio=0.06, pad_y_ratio=0.04):
    left, top, right, bottom = sanitize_pixel_box(pixel_box, width, height)
    pad_x = int(round((right - left)   * pad_x_ratio))
    pad_y = int(round((bottom - top)   * pad_y_ratio))
    return sanitize_pixel_box((left - pad_x, top - pad_y, right + pad_x, bottom + pad_y), width, height)


def expand_pixel_box_top_heavy(pixel_box, width, height,
                                pad_x_ratio=0.08, pad_top_ratio=0.28, pad_bottom_ratio=0.02):
    left, top, right, bottom = sanitize_pixel_box(pixel_box, width, height)
    box_w = max(1, right - left)
    box_h = max(1, bottom - top)
    pad_x   = int(round(box_w * pad_x_ratio))
    pad_top = int(round(box_h * pad_top_ratio))
    pad_bot = int(round(box_h * pad_bottom_ratio))
    return sanitize_pixel_box(
        (left - pad_x, top - pad_top, right + pad_x, bottom + pad_bot), width, height
    )


def build_box_mask(height, width, pixel_box, pad_x_ratio=0.06, pad_y_ratio=0.04):
    import cv2
    import numpy as np

    left, top, right, bottom = expand_pixel_box(
        pixel_box, width, height, pad_x_ratio=pad_x_ratio, pad_y_ratio=pad_y_ratio
    )
    mask = np.zeros((height, width), dtype=np.uint8)
    cv2.rectangle(mask, (left, top),
                  (max(left + 1, right - 1), max(top + 1, bottom - 1)),
                  255, thickness=-1)
    return mask


def get_expected_door_aspect_ratio(product, door_rgba=None):
    try:
        if product.width and product.height:
            ratio = float(product.width) / float(product.height)
            if 0.15 <= ratio <= 0.95:
                return ratio
    except (TypeError, ValueError, ZeroDivisionError):
        pass
    if door_rgba is not None:
        door_height, door_width = door_rgba.shape[:2]
        if door_height > 0:
            ratio = door_width / float(door_height)
            if 0.15 <= ratio <= 0.95:
                return ratio
    return 0.45


def score_door_candidate(x, y, candidate_width, candidate_height,
                          image_width, image_height, expected_aspect_ratio, signal_mask):
    import numpy as np

    area       = candidate_width * candidate_height
    area_ratio = area / float(max(1, image_width * image_height))
    height_ratio  = candidate_height / float(max(1, image_height))
    width_ratio   = candidate_width  / float(max(1, image_width))
    aspect_ratio  = candidate_width  / float(max(1, candidate_height))

    if area_ratio < 0.04 or area_ratio > 0.85:
        return None
    if height_ratio < 0.40 or width_ratio < 0.12:
        return None
    if aspect_ratio < 0.18 or aspect_ratio > 0.90:
        return None

    bottom_ratio = (y + candidate_height) / float(max(1, image_height))
    if bottom_ratio < 0.82:
        return None
    if candidate_width > candidate_height:
        return None

    floor_anchor_bonus = 15.0 if bottom_ratio > 0.94 else 0
    top_ratio   = y / float(max(1, image_height))
    top_penalty = (1.0 - top_ratio) * 3.0
    center_x_dist  = abs(((x + candidate_width / 2.0) / max(1, image_width)) - 0.5)
    aspect_penalty  = abs(aspect_ratio - expected_aspect_ratio)
    region = signal_mask[y: y + candidate_height, x: x + candidate_width]
    edge_density = float(np.count_nonzero(region)) / float(max(1, area))

    score = (
        (height_ratio * 6.0) + (area_ratio * 4.0) + (bottom_ratio * 5.0)
        + (edge_density * 2.5) - (center_x_dist * 8.0)
        - (aspect_penalty * 2.0) - top_penalty + floor_anchor_bonus
    )
    if 0.3 <= aspect_ratio <= 0.6:
        score += 2.0
    return score


# ═════════════════════════════════════════════════════════════════════════════
#  SECTION 2 — DOOR ASSET UTILITIES
# ═════════════════════════════════════════════════════════════════════════════

@lru_cache(maxsize=1)
def load_optional_yolo_model(model_path):
    from ultralytics import YOLO
    return YOLO(model_path)


@lru_cache(maxsize=1)
def get_rembg_session():
    import rembg
    return rembg.new_session("u2net")


def border_transparency_ratio(alpha_mask):
    import numpy as np

    if alpha_mask is None:
        return 0.0
    height, width = alpha_mask.shape[:2]
    border = max(2, min(height, width) // 16)
    top    = alpha_mask[:border, :]
    bottom = alpha_mask[max(0, height - border):, :]
    left   = alpha_mask[:, :border]
    right  = alpha_mask[:, max(0, width - border):]
    pixels = np.concatenate([top.reshape(-1), bottom.reshape(-1),
                              left.reshape(-1), right.reshape(-1)])
    if pixels.size == 0:
        return 0.0
    return float(np.count_nonzero(pixels <= 10)) / float(pixels.size)


def trim_white_border_from_rgba(door_rgba, threshold=248):
    import cv2
    import numpy as np

    if door_rgba is None or door_rgba.shape[2] < 4:
        return door_rgba
    b, g, r, a = cv2.split(door_rgba)
    is_white = (b >= threshold) & (g >= threshold) & (r >= threshold)
    non_bg   = (a > 20) & (~is_white)
    coords   = cv2.findNonZero(non_bg.astype(np.uint8))
    if coords is not None:
        x, y, w, h = cv2.boundingRect(coords)
        return door_rgba[
            max(0, y - 1): min(door_rgba.shape[0], y + h + 1),
            max(0, x - 1): min(door_rgba.shape[1], x + w + 1),
        ]
    return door_rgba


def normalize_door_rgba_asset(door_rgba):
    import cv2
    import numpy as np

    if door_rgba is None:
        return None
    if door_rgba.ndim == 2:
        door_rgba = cv2.cvtColor(door_rgba, cv2.COLOR_GRAY2BGRA)
    elif door_rgba.shape[2] == 3:
        return None
    elif door_rgba.shape[2] > 4:
        door_rgba = door_rgba[:, :, :4]

    alpha_mask = refine_product_mask(door_rgba[:, :, 3])
    if alpha_mask is None or not is_reasonable_door_mask(alpha_mask):
        return None
    if border_transparency_ratio(alpha_mask) < 0.20:
        return None

    normalized = door_rgba.copy()
    normalized[:, :, 3] = alpha_mask
    normalized = trim_white_border_from_rgba(normalized)

    final_alpha = normalized[:, :, 3]
    coords = cv2.findNonZero(final_alpha)
    if coords is not None:
        x, y, w, h = cv2.boundingRect(coords)
        normalized = normalized[y: y + h, x: x + w]
    return normalized


def rgba_with_full_alpha(image_data):
    import cv2
    import numpy as np

    if image_data is None:
        return None
    if image_data.ndim == 2:
        image_data = cv2.cvtColor(image_data, cv2.COLOR_GRAY2BGR)
    if image_data.shape[2] == 4:
        return image_data
    alpha = np.full(image_data.shape[:2] + (1,), 255, dtype=np.uint8)
    return np.concatenate([image_data[:, :, :3], alpha], axis=2)


def candidate_product_image_paths(product):
    seen = set()
    for attr_name in ("image_no_bg", "image", "original_image"):
        field = getattr(product, attr_name, None)
        if not field or not getattr(field, "name", ""):
            continue
        try:
            path = field.path
        except Exception:
            continue
        if not path or not os.path.exists(path) or path in seen:
            continue
        seen.add(path)
        yield attr_name, path


def extract_door_rgba_from_bytes(image_bytes):
    import cv2
    import numpy as np
    import rembg

    output_bytes = rembg.remove(image_bytes, session=get_rembg_session())
    rgba = cv2.imdecode(np.frombuffer(output_bytes, np.uint8), cv2.IMREAD_UNCHANGED)
    return normalize_door_rgba_asset(rgba)


def load_best_door_rgba(product):
    import cv2

    fallback_bytes = None
    fallback_image = None
    original_bytes = None

    for label, path in candidate_product_image_paths(product):
        image_data = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        normalized = normalize_door_rgba_asset(image_data)
        if normalized is not None:
            print(f"DEBUG: [AI Service] Using {label} asset: {path}")
            return normalized
        if fallback_image is None and image_data is not None:
            fallback_image = image_data
        try:
            with open(path, "rb") as f:
                raw_bytes = f.read()
        except Exception:
            raw_bytes = None
        if raw_bytes and fallback_bytes is None:
            fallback_bytes = raw_bytes
        if raw_bytes and label == "original_image":
            original_bytes = raw_bytes

    source_bytes = original_bytes or fallback_bytes
    if source_bytes:
        try:
            regenerated = extract_door_rgba_from_bytes(source_bytes)
            if regenerated is not None:
                print("DEBUG: [AI Service] Rebuilt door alpha from source image")
                return regenerated
        except Exception as exc:
            print(f"WARNING: [AI Service] Could not rebuild door alpha: {exc}")

    fallback_rgba = rgba_with_full_alpha(fallback_image)
    if fallback_rgba is not None:
        print("WARNING: [AI Service] Falling back to opaque door asset")
        return fallback_rgba

    raise ValueError("No usable door asset found for visualization")


# ═════════════════════════════════════════════════════════════════════════════
#  SECTION 3 — DOOR DETECTION UTILITIES  (OpenCV / YOLO fallbacks)
# ═════════════════════════════════════════════════════════════════════════════

def detect_door_box_with_yolo(room_bgr, expected_aspect_ratio):
    model_path = str(getattr(settings, "YOLO_DOOR_MODEL_PATH", "") or "").strip()
    if not model_path or not os.path.exists(model_path):
        return None
    try:
        model = load_optional_yolo_model(model_path)
        results = model.predict(room_bgr, conf=0.20, verbose=False)
    except Exception as exc:
        print(f"DEBUG: [YOLO] Detection unavailable: {exc}")
        return None

    image_height, image_width = room_bgr.shape[:2]
    best_box  = None
    best_score = float("-inf")

    for result in results:
        boxes = getattr(result, "boxes", None)
        if boxes is None:
            continue
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            confidence = float(box.conf[0]) if getattr(box, "conf", None) is not None else 0.0
            left, top, right, bottom = sanitize_pixel_box((x1, y1, x2, y2), image_width, image_height)
            aspect_ratio   = (right - left) / float(max(1, bottom - top))
            aspect_penalty = abs(aspect_ratio - expected_aspect_ratio)
            center_penalty = abs((((left + right) / 2.0) / max(1, image_width)) - 0.5)
            score = (confidence * 10.0) - (aspect_penalty * 2.0) - (center_penalty * 1.5)
            if score > best_score:
                best_score = score
                best_box = (left, top, right, bottom)
    return best_box


def detect_door_box_with_opencv(room_bgr, expected_aspect_ratio):
    import cv2
    import numpy as np

    gray   = cv2.cvtColor(room_bgr, cv2.COLOR_BGR2GRAY)
    clahe  = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    gray   = clahe.apply(gray)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges   = cv2.Canny(blurred, 40, 120)
    adaptive = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                      cv2.THRESH_BINARY_INV, 41, 5)
    combined = cv2.bitwise_or(edges, adaptive)
    kernel   = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    combined = cv2.morphologyEx(combined, cv2.MORPH_CLOSE, kernel, iterations=3)
    combined = cv2.dilate(combined, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3)), iterations=1)

    contours, _ = cv2.findContours(combined, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    image_height, image_width = gray.shape[:2]
    best_box  = None
    best_score = float("-inf")

    for contour in contours:
        x, y, cw, ch = cv2.boundingRect(contour)
        score = score_door_candidate(x, y, cw, ch, image_width, image_height,
                                      expected_aspect_ratio, combined)
        if score is None:
            continue
        rectangularity = cv2.contourArea(contour) / float(max(1, cw * ch))
        total_score = score + (rectangularity * 0.8)
        if total_score > best_score:
            best_score = total_score
            best_box = (x, y, x + cw, y + ch)
    return best_box


def default_door_box(image_width, image_height, expected_aspect_ratio):
    box_height = int(round(image_height * 0.82))
    box_width  = int(round(box_height * expected_aspect_ratio))
    box_width  = max(int(image_width * 0.18), min(box_width, int(image_width * 0.55)))
    left       = int(round((image_width - box_width) / 2.0))
    bottom     = int(round(image_height * 0.97))
    top        = bottom - box_height
    return sanitize_pixel_box((left, top, left + box_width, bottom), image_width, image_height)


def normalize_door_opening_box(pixel_box, image_width, image_height, expected_aspect_ratio):
    left, top, right, bottom = sanitize_pixel_box(pixel_box, image_width, image_height)
    width  = right - left
    height = bottom - top
    min_width  = int(image_width  * 0.18)
    min_height = int(image_height * 0.30)
    frame_aspect = min(0.95, max(0.24, expected_aspect_ratio * 1.12))
    width_ratio  = width / float(max(1, height))

    if width < min_width or height < min_height or width_ratio < (frame_aspect * 0.88):
        box_height = max(height, int(round(image_height * 0.68)))
        box_width  = int(round(box_height * frame_aspect))
        box_width  = max(min_width, min(box_width, int(image_width * 0.58)))
        center_x   = (left + right) / 2.0
        left  = int(round(center_x - box_width / 2.0))
        right = left + box_width
        top   = max(0, bottom - box_height)

    final_width  = right - left
    final_height = bottom - top
    pad_w = int(final_width  * 0.05)
    pad_h = int(final_height * 0.04)
    return sanitize_pixel_box((left - pad_w, top - pad_h, right + pad_w, bottom),
                               image_width, image_height)


def detect_door_opening_box(room_bgr, expected_aspect_ratio):
    """YOLO → OpenCV → default fallback chain."""
    image_height, image_width = room_bgr.shape[:2]

    yolo_box = detect_door_box_with_yolo(room_bgr, expected_aspect_ratio)
    if yolo_box is not None:
        normalized = normalize_door_opening_box(yolo_box, image_width, image_height,
                                                 expected_aspect_ratio)
        return normalized, "yolo"

    opencv_box = detect_door_box_with_opencv(room_bgr, expected_aspect_ratio)
    if opencv_box is not None:
        normalized = normalize_door_opening_box(opencv_box, image_width, image_height,
                                                 expected_aspect_ratio)
        return normalized, "opencv"

    default_box = default_door_box(image_width, image_height, expected_aspect_ratio)
    normalized  = normalize_door_opening_box(default_box, image_width, image_height,
                                              expected_aspect_ratio)
    return normalized, "default"


# ═════════════════════════════════════════════════════════════════════════════
#  SECTION 4 — ROOM COMPOSITING UTILITIES
# ═════════════════════════════════════════════════════════════════════════════

def remove_door_from_room_locally(room_bgr, pixel_box):
    """Remove old door using OpenCV TELEA inpainting."""
    import cv2
    import numpy as np

    image_height, image_width = room_bgr.shape[:2]
    left, top, right, bottom  = sanitize_pixel_box(pixel_box, image_width, image_height)
    mask = np.zeros((image_height, image_width), dtype=np.uint8)
    mask[top:bottom, left:right] = 255
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=1)
    return cv2.inpaint(room_bgr, mask, inpaintRadius=5, flags=cv2.INPAINT_TELEA)


def apply_soft_shadow(room_bgr, alpha_mask, left, top, strength=0.18):
    import cv2
    import numpy as np

    image_height, image_width = room_bgr.shape[:2]
    shadow_alpha  = alpha_mask.astype(np.float32) / 255.0
    shadow_canvas = np.zeros((image_height, image_width), dtype=np.float32)

    door_height, door_width = alpha_mask.shape[:2]
    offset_x = max(1, door_width  // 55)
    offset_y = max(1, door_height // 35)
    sl = max(0, left + offset_x);  sr = min(image_width,  sl + door_width)
    st = max(0, top  + offset_y);  sb = min(image_height, st + door_height)

    if sr <= sl or sb <= st:
        return room_bgr

    alpha_crop = shadow_alpha[: sb - st, : sr - sl]
    shadow_canvas[st:sb, sl:sr] = np.maximum(shadow_canvas[st:sb, sl:sr], alpha_crop)

    blur_size = max(9, ((min(door_width, door_height) // 6) | 1))
    shadow_canvas = cv2.GaussianBlur(shadow_canvas, (blur_size, blur_size), 0)

    shaded = room_bgr.astype(np.float32)
    shaded *= 1.0 - (shadow_canvas[..., None] * strength)
    return np.clip(shaded, 0, 255).astype(np.uint8)


def compute_floor_aligned_door_box(pixel_box, door_rgba, image_width, image_height,
                                    fill_ratio=0.90, top_margin_ratio=0.05):
    left, top, right, bottom = sanitize_pixel_box(pixel_box, image_width, image_height)
    box_width  = max(1, right - left)
    box_height = max(1, bottom - top)

    if door_rgba is None or door_rgba.ndim < 2:
        return left, top, right, bottom

    door_height, door_width = door_rgba.shape[:2]
    if door_height <= 0 or door_width <= 0:
        return left, top, right, bottom

    scale        = min(box_width * fill_ratio / float(door_width),
                       box_height * (1.0 - top_margin_ratio) / float(door_height))
    target_width  = max(1, min(box_width,  int(round(door_width  * scale))))
    target_height = max(1, min(box_height, int(round(door_height * scale))))

    door_x = left + max(0, (box_width - target_width) // 2)
    door_y = bottom - target_height
    min_top = top + int(round(box_height * top_margin_ratio))
    if door_y < min_top:
        door_y = min_top

    return sanitize_pixel_box(
        (door_x, door_y, door_x + target_width, door_y + target_height),
        image_width, image_height,
    )


def sample_room_ambient_bgr(room_bgr, pixel_box):
    import numpy as np

    image_height, image_width = room_bgr.shape[:2]
    left, top, right, bottom  = sanitize_pixel_box(pixel_box, image_width, image_height)
    box_width  = max(1, right - left)
    box_height = max(1, bottom - top)
    side_band  = max(4, int(round(box_width  * 0.10)))
    top_band   = max(4, int(round(box_height * 0.12)))

    samples = []
    if top  > 0:
        samples.append(room_bgr[max(0, top - top_band):top,
                                 max(0, left - side_band): min(image_width, right + side_band)])
    if left > 0:
        samples.append(room_bgr[top:bottom, max(0, left - side_band):left])
    if right < image_width:
        samples.append(room_bgr[top:bottom, right: min(image_width, right + side_band)])

    sample_pixels = [r.reshape(-1, 3) for r in samples if r.size]
    if not sample_pixels:
        return room_bgr.reshape(-1, 3).mean(axis=0).astype(np.float32)

    ambient    = np.concatenate(sample_pixels, axis=0).mean(axis=0)
    scene_mean = room_bgr.reshape(-1, 3).mean(axis=0)
    return ((ambient * 0.75) + (scene_mean * 0.25)).astype(np.float32)


def match_door_lighting_to_room(door_rgba, room_bgr, pixel_box):
    import cv2
    import numpy as np

    if door_rgba is None:
        return None
    matched = door_rgba.copy()
    if matched.ndim != 3 or matched.shape[2] < 4:
        return matched

    alpha_mask = matched[:, :, 3] > 12
    if not np.any(alpha_mask):
        return matched

    ambient_bgr = sample_room_ambient_bgr(room_bgr, pixel_box)
    door_rgb    = matched[:, :, :3].astype(np.float32)
    door_mean   = door_rgb[alpha_mask].mean(axis=0)

    luminance_gain = np.clip(float(np.mean(ambient_bgr)) / float(max(1.0, np.mean(door_mean))), 0.88, 1.14)
    chroma_gain    = np.clip(ambient_bgr / np.maximum(door_mean, 1.0), 0.85, 1.15)
    chroma_gain    = 1.0 + ((chroma_gain - 1.0) * 0.35)
    total_gain     = np.clip(chroma_gain * luminance_gain, 0.82, 1.18)

    vertical_gradient = np.linspace(1.02, 0.95, matched.shape[0], dtype=np.float32).reshape(-1, 1, 1)
    adjusted_rgb      = door_rgb * total_gain * vertical_gradient

    alpha_channel = matched[:, :, 3]
    alpha_kernel  = max(5, ((min(matched.shape[0], matched.shape[1]) // 30) | 1))
    tightened     = cv2.erode(alpha_channel, np.ones((3, 3), dtype=np.uint8), iterations=1)
    feathered     = cv2.GaussianBlur(tightened, (alpha_kernel, alpha_kernel), 0)
    alpha_float   = np.clip(feathered.astype(np.float32) / 255.0, 0.0, 1.0)

    edge_band = np.clip((0.88 - alpha_float) / 0.88, 0.0, 1.0)
    edge_band *= (alpha_float > 0.0).astype(np.float32)
    if np.any(edge_band > 0.0):
        edge_mix     = np.clip(edge_band[..., None] * 0.40, 0.0, 0.40)
        adjusted_rgb = (adjusted_rgb * (1.0 - edge_mix)) + (ambient_bgr.reshape(1, 1, 3) * edge_mix)

    matched[:, :, :3] = np.clip(adjusted_rgb, 0, 255).astype(np.uint8)
    matched[:, :, 3]  = feathered
    return matched


def overlay_door_into_room(room_bgr, door_rgba, pixel_box, add_shadow=True, wall_angle=0):
    import cv2
    import numpy as np

    image_height, image_width = room_bgr.shape[:2]
    left, top, right, bottom  = sanitize_pixel_box(pixel_box, image_width, image_height)

    if door_rgba.ndim != 3 or door_rgba.shape[2] < 4:
        if door_rgba.ndim == 2:
            door_rgba = cv2.cvtColor(door_rgba, cv2.COLOR_GRAY2BGRA)
        else:
            alpha = np.full(door_rgba.shape[:2] + (1,), 255, dtype=np.uint8)
            door_rgba = np.concatenate([door_rgba[:, :, :3], alpha], axis=2)

    pl, pt, pr, pb = compute_floor_aligned_door_box(
        (left, top, right, bottom), door_rgba, image_width, image_height
    )
    target_width  = max(1, pr - pl)
    target_height = max(1, pb - pt)

    resized_door = cv2.resize(door_rgba, (target_width, target_height), interpolation=cv2.INTER_LANCZOS4)

    if abs(wall_angle) > 2:
        shrink_ratio = min(0.3, abs(wall_angle) / 100.0)
        shrink_px    = int(target_height * shrink_ratio)
        src_pts      = np.float32([[0,0],[target_width,0],[target_width,target_height],[0,target_height]])
        if wall_angle > 0:
            dst_pts = np.float32([[0,0],[target_width,shrink_px],[target_width,target_height-shrink_px],[0,target_height]])
        else:
            dst_pts = np.float32([[0,shrink_px],[target_width,0],[target_width,target_height],[0,target_height-shrink_px]])
        M = cv2.getPerspectiveTransform(src_pts, dst_pts)
        resized_door = cv2.warpPerspective(resized_door, M, (target_width, target_height),
                                            flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT,
                                            borderValue=(0,0,0,0))

    composite = room_bgr.copy()
    if add_shadow:
        composite = apply_soft_shadow(composite, resized_door[:, :, 3], pl, pt)

    alpha_channel = resized_door[:, :, 3]
    alpha_kernel  = max(3, ((min(target_width, target_height) // 22) | 1))
    tightened     = cv2.erode(alpha_channel, np.ones((3, 3), dtype=np.uint8), iterations=1)
    feathered     = cv2.GaussianBlur(tightened, (alpha_kernel, alpha_kernel), 0)
    alpha         = np.clip(feathered.astype(np.float32) / 255.0, 0.0, 1.0)

    wall_clean = room_bgr[pt:pb, pl:pr].astype(np.float32)
    region     = composite[pt:pb, pl:pr].astype(np.float32)
    door_rgb   = resized_door[:, :, :3].astype(np.float32)

    edge_band = np.clip((0.92 - alpha) / 0.92, 0.0, 1.0) * (alpha > 0.0).astype(np.float32)
    edge_band = cv2.GaussianBlur(edge_band, (alpha_kernel, alpha_kernel), 0)
    if np.any(edge_band > 0.0):
        edge_mix = np.clip(edge_band[..., None] * 0.40, 0.0, 0.40)
        door_rgb = (door_rgb * (1.0 - edge_mix)) + (wall_clean * edge_mix)

    blended = (alpha[..., None] * door_rgb) + ((1.0 - alpha[..., None]) * region)
    composite[pt:pb, pl:pr] = np.clip(blended, 0, 255).astype(np.uint8)
    return composite


def add_floor_contact_shadow(room_bgr, pixel_box, strength=0.24):
    import cv2
    import numpy as np

    image_height, image_width = room_bgr.shape[:2]
    left, top, right, bottom  = sanitize_pixel_box(pixel_box, image_width, image_height)
    box_width  = max(1, right - left)
    box_height = max(1, bottom - top)

    shadow_height   = max(4, int(round(box_height * 0.025)))
    inset           = max(1, int(round(box_width  * 0.02)))
    shadow_left     = min(right,  max(left, left + inset))
    shadow_right    = max(shadow_left + 1, max(left + 1, right - inset))
    contact_overlap = max(2, int(round(box_height * 0.012)))
    sy_start        = max(0, bottom - contact_overlap)
    sy_end          = min(image_height, bottom + shadow_height)

    if sy_start >= sy_end or shadow_right <= shadow_left:
        return room_bgr

    shadow_mask = np.zeros((image_height, image_width), dtype=np.float32)
    shadow_mask[sy_start:sy_end, shadow_left:shadow_right] = 1.0

    blur_x = max(9, ((max(3, shadow_right - shadow_left) // 5) | 1))
    blur_y = max(7, (((sy_end - sy_start) * 2) | 1))
    shadow_mask = cv2.GaussianBlur(shadow_mask, (blur_x, blur_y), 0)

    vertical_fade = np.ones((image_height, 1), dtype=np.float32)
    below_bottom  = min(image_height, bottom + shadow_height)
    if bottom < below_bottom:
        vertical_fade[bottom:below_bottom, 0] = np.linspace(1.0, 0.0, below_bottom - bottom)
    shadow_mask *= vertical_fade

    shaded = room_bgr.copy().astype(np.float32)
    shaded *= 1.0 - (shadow_mask[..., None] * strength)
    return np.clip(shaded, 0, 255).astype(np.uint8)


def validate_locked_scene_candidate(candidate_bgr, baseline_bgr, pixel_box,
                                     mse_threshold=12.0, ratio_threshold=0.015):
    import numpy as np

    if (candidate_bgr is None or baseline_bgr is None
            or candidate_bgr.shape != baseline_bgr.shape):
        return False, {"reason": "shape_mismatch"}

    image_height, image_width = baseline_bgr.shape[:2]
    validation_mask = build_box_mask(image_height, image_width, pixel_box,
                                      pad_x_ratio=0.05, pad_y_ratio=0.05)
    outside_mask = validation_mask == 0
    if not np.any(outside_mask):
        return False, {"reason": "empty_outside_region"}

    baseline_pixels  = baseline_bgr[outside_mask].astype(np.float32)
    candidate_pixels = candidate_bgr[outside_mask].astype(np.float32)
    diff = np.abs(candidate_pixels - baseline_pixels)

    mse           = float(np.mean((candidate_pixels - baseline_pixels) ** 2))
    changed_ratio = float(np.mean(np.max(diff, axis=1) > 16.0))

    interior_mask      = validation_mask > 0
    interior_baseline  = baseline_bgr[interior_mask].astype(np.float32)
    interior_candidate = candidate_bgr[interior_mask].astype(np.float32)
    interior_mse       = float(np.mean((interior_candidate - interior_baseline) ** 2))
    is_interior_changed = interior_mse >= 0.5

    is_valid = mse <= mse_threshold and changed_ratio <= ratio_threshold and is_interior_changed
    return is_valid, {
        "mse": round(mse, 3),
        "changed_ratio": round(changed_ratio, 5),
        "interior_mse": round(interior_mse, 3),
        "is_interior_changed": bool(is_interior_changed),
        "thresholds": {"mse": mse_threshold, "ratio": ratio_threshold},
    }


# ═════════════════════════════════════════════════════════════════════════════
#  SECTION 5 — AI SERVICE  (GPT Image 2 powered)
# ═════════════════════════════════════════════════════════════════════════════

class AIService:
    """
    Door visualization service — powered by GPT-4o (detection + description)
    and gpt-image-2 (world-class inpainting).
    """

    # ── OpenAI Client ──────────────────────────────────────────────────────

    @staticmethod
    def get_openai_client():
        from openai import OpenAI
        api_key = str(getattr(settings, "OPENAI_API_KEY", "") or "").strip()
        if not api_key:
            raise ValueError("OPENAI_API_KEY settings.py da topilmadi")
        return OpenAI(api_key=api_key, timeout=60.0, max_retries=2)

    @staticmethod
    def get_visualization_provider(default="gpt_image_2"):
        try:
            from .models import SystemSettings
            provider = str(
                getattr(SystemSettings.get_solo(), "ai_provider", default) or default
            ).strip().lower()
            if provider in {"gpt_image_2", "hybrid", "opencv"}:
                return provider
        except Exception as e:
            print(f"DEBUG: [AI Service] Provider lookup failed: {e}")
        return default

    # ── GPT-4o: Door Detection ─────────────────────────────────────────────

    @staticmethod
    def detect_door_box_with_gpt4o(room_image_bytes, image_width, image_height):
        """
        Use GPT-4o high-resolution vision to locate the door frame precisely.
        Returns pixel_box (left, top, right, bottom) or None.
        """
        import json

        client = AIService.get_openai_client()
        b64    = base64.b64encode(room_image_bytes).decode()

        prompt = (
            "You are an expert architectural photo analyst.\n"
            "Locate the main door (or door opening) in this room photo.\n"
            "Return ONLY a JSON object with normalized 0–1000 coordinates:\n"
            '{"ymin": int, "xmin": int, "ymax": int, "xmax": int}\n'
            "Include the complete door assembly: frame, crown molding, full height from floor to top. "
            "If multiple doors exist, choose the largest / most centered one."
        )

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url",
                         "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "high"}},
                        {"type": "text", "text": prompt},
                    ],
                }],
                response_format={"type": "json_object"},
                max_tokens=200,
            )
            coords = json.loads(response.choices[0].message.content)
            ymin = float(coords.get("ymin", 100))
            xmin = float(coords.get("xmin", 200))
            ymax = float(coords.get("ymax", 900))
            xmax = float(coords.get("xmax", 800))

            # Normalise: sometimes GPT returns 0-1 floats instead of 0-1000
            if max(ymin, xmin, ymax, xmax) <= 1.5:
                ymin, xmin, ymax, xmax = ymin*1000, xmin*1000, ymax*1000, xmax*1000

            pixel_box = box_1000_to_pixels([ymin, xmin, ymax, xmax], image_width, image_height)
            print(f"DEBUG: [GPT-4o Detection] Box: {pixel_box}")
            return pixel_box

        except Exception as e:
            print(f"WARNING: [GPT-4o Detection] Failed: {e}")
            return None

    # ── GPT-4o: Door Visual Description ───────────────────────────────────

    @staticmethod
    def describe_door_with_gpt4o(door_image_path):
        """
        Use GPT-4o vision to generate a detailed visual description of the door.
        This description is injected into the gpt-image-2 prompt so the model
        can replicate the exact door appearance without a reference image.
        """
        if not door_image_path or not os.path.exists(door_image_path):
            return None

        client = AIService.get_openai_client()

        with open(door_image_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()

        ext = os.path.splitext(door_image_path)[1].lower()
        mime = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"

        prompt = (
            "Describe this door in precise detail for a professional photo editor "
            "who needs to install it into a room photo. Cover: exact color and finish "
            "(matte/satin/gloss), panel layout (count, shape, size), material "
            "(solid wood / MDF / PVC / glass-insert), any glass panes and their style, "
            "hardware (handle type, color, position), decorative molding, "
            "and overall proportions (narrow/standard/double). "
            "Be specific and concise — max 120 words."
        )

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "image_url",
                         "image_url": {"url": f"data:{mime};base64,{b64}", "detail": "high"}},
                        {"type": "text", "text": prompt},
                    ],
                }],
                max_tokens=180,
            )
            description = response.choices[0].message.content.strip()
            print(f"DEBUG: [GPT-4o Door Desc] {description[:80]}...")
            return description

        except Exception as e:
            print(f"WARNING: [GPT-4o Door Desc] Failed: {e}")
            return None

    # ── GPT Image 2: Mask ─────────────────────────────────────────────────
    @staticmethod
    def build_gpt_image_2_mask(image_width, image_height, pixel_box):
        """
        Build RGBA mask for gpt-image-2.
        Convention: transparent (alpha=0) = EDIT ZONE | opaque (alpha=255) = KEEP.
        Door aspect ratio is enforced to prevent vertical stretching.
        """
        import numpy as np

        mask_arr = np.full((image_height, image_width, 4), 255, dtype=np.uint8)
        x1, y1, x2, y2 = sanitize_pixel_box(pixel_box, image_width, image_height)

        box_width  = x2 - x1
        box_height = y2 - y1

        DOOR_ASPECT_RATIO  = 1.8
        max_allowed_height = int(box_width * DOOR_ASPECT_RATIO)

        if box_height > max_allowed_height:
            excess = box_height - max_allowed_height
            y1 = y1 + int(excess * 0.4)
            y2 = y2 - int(excess * 0.6)

        mask_arr[y1:y2, x1:x2, 3] = 0
        return Image.fromarray(mask_arr, mode="RGBA")

    # ── GPT Image 2: Core Edit ────────────────────────────────────────────


    @staticmethod
    def edit_room_with_gpt_image_2(room_pil, mask_pil, prompt, door_pil=None):
        """
        Core gpt-image-2 inpainting call.
        door_pil: mahsulot rasmi — 2-rasm sifatida beriladi (gpt-image-2 multi-image).
        Model ikkala rasmni ko'radi va door_pil dagi eshikni xonaga o'rnatadi.
        Returns edited PIL image (RGB).
        """
        client = AIService.get_openai_client()

        w_orig, h_orig = room_pil.size

        MAX_PX = 1536
        scale  = min(MAX_PX / w_orig, MAX_PX / h_orig, 1.0)
        if scale < 1.0:
            w_s, h_s = int(w_orig * scale), int(h_orig * scale)
            room_pil = room_pil.resize((w_s, h_s), Image.Resampling.LANCZOS)
            mask_pil = mask_pil.resize((w_s, h_s), Image.Resampling.NEAREST)

        # Xona rasmi encode
        room_buf = io.BytesIO()
        room_pil.convert("RGBA").save(room_buf, format="PNG")
        room_buf.seek(0)

        mask_buf = io.BytesIO()
        mask_pil.convert("RGBA").save(mask_buf, format="PNG")
        mask_buf.seek(0)

        # Mahsulot rasmi berilgan bo'lsa — multi-image rejimi
        if door_pil is not None:
            door_copy = door_pil.copy()
            door_copy.thumbnail((768, 768), Image.Resampling.LANCZOS)
            door_buf = io.BytesIO()
            door_copy.convert("RGBA").save(door_buf, format="PNG")
            door_buf.seek(0)
            image_arg = [
                ("room.png", room_buf, "image/png"),
                ("door.png", door_buf, "image/png"),
            ]
            print("[Step 4] Using multi-image mode (room + door reference)")
        else:
            image_arg = ("room.png", room_buf, "image/png")
            print("[Step 4] Single-image mode (text description only)")

        response = client.images.edit(
            model="gpt-image-2",
            image=image_arg,
            mask=("mask.png",   mask_buf, "image/png"),
            prompt=prompt,
            n=1,
            size="1024x1024",
            quality="low",
        )

        img_bytes = base64.b64decode(response.data[0].b64_json)
        result    = Image.open(io.BytesIO(img_bytes)).convert("RGB")
# Restore original resolution (aspect-ratio safe)
        result_w, result_h = result.size
        # Agar API kvadrat qaytargan bo'lsa, crop qilib to'g'ri nisbatga keltirish
        if w_orig != h_orig:
            target_ratio = w_orig / h_orig
            if result_w / result_h > target_ratio:
                # Kenglikni crop
                new_w = int(result_h * target_ratio)
                left = (result_w - new_w) // 2
                result = result.crop((left, 0, left + new_w, result_h))
            else:
                # Balandlikni crop
                new_h = int(result_w / target_ratio)
                top = (result_h - new_h) // 2
                result = result.crop((0, top, result_w, top + new_h))
        
        if scale < 1.0 or result.size != (w_orig, h_orig):
            result = result.resize((w_orig, h_orig), Image.Resampling.LANCZOS)
        return result
    
    # ── Prompt Builder ────────────────────────────────────────────────────

    @staticmethod
    def build_door_replacement_prompt(product, pixel_box, image_width, image_height,
                                       door_visual_description=None, has_reference_image=False):
        """
        Build prompt for gpt-image-2 door replacement.
        has_reference_image=True: mahsulot rasmi 2-rasm sifatida berilgan — u asosiy manba.
        has_reference_image=False: faqat matn tavsifi bilan ishlaydi (fallback).
        """
        door_name = getattr(product, "name", "interior door")
        x1, y1, x2, y2 = sanitize_pixel_box(pixel_box, image_width, image_height)

        if has_reference_image:
            # Model 2-rasmni ko'radi — u aniq mahsulot eshigi
            return (
                f"You are a professional architectural photo editor. Task: door replacement.\n\n"
                f"REFERENCE IMAGE: The SECOND image is the exact door product '{door_name}' to install. "
                f"Copy its appearance with 100% fidelity — identical color, finish, panel layout, "
                f"glass inserts, hardware, molding, and proportions. Do not invent or change any detail.\n\n"
                f"EDIT ZONE: The transparent (alpha=0) mask area marks exactly where to install the door. "
                f"Pixel box — left={x1}, top={y1}, right={x2}, bottom={y2} "
                f"({x2-x1}px wide × {y2-y1}px tall).\n\n"
                f"MANDATORY RULES:\n"
                f"1. DESTROY the old door completely — remove leaf, frame, molding, arch, trim, architrave — zero traces.\n"
                f"2. INSTALL the door from the second reference image — pixel-faithful reproduction.\n"
                f"3. Align door base flush with the floor line.\n"
                f"4. Match room perspective, lighting direction, and ambient warmth precisely.\n"
                f"5. Add natural contact shadow where door base meets floor.\n"
                f"6. Blend frame edges seamlessly into surrounding wall — no halo, no hard lines.\n"
                f"7. KEEP everything outside the mask area PIXEL-PERFECT identical.\n"
                f"8. Result must look like a real professional photograph.\n"
                f"9. Door handle/knob must be on the correct side matching the room photo.\n"
                f"10. CRITICAL: Do NOT stretch, elongate, or alter door proportions in any direction."
            )

        # Fallback: faqat matn tavsifi (mahsulot rasmi yuklanmagan holat)
        attrs = []
        for attr in ("color", "material", "style", "finish"):
            val = str(getattr(product, attr, "") or "").strip()
            if val:
                attrs.append(f"{attr}: {val}")
        attr_str = f" ({', '.join(attrs)})" if attrs else ""

        desc_block = (
            f"\nDOOR VISUAL REFERENCE:\n{door_visual_description}\n"
            if door_visual_description
            else ""
        )

        return (
            f"You are a professional architectural photo editor. Task: door replacement.\n\n"
            f"INSTALL THIS DOOR: '{door_name}'{attr_str}{desc_block}\n"
            f"PLACEMENT: The transparent mask area marks the exact edit zone. "
            f"Pixel coordinates — left={x1}, top={y1}, right={x2}, bottom={y2}. "
            f"Mask dimensions: {x2-x1}px wide × {y2-y1}px tall.\n\n"
            f"MANDATORY RULES:\n"
            f"1. DESTROY the old door completely — remove leaf, frame, molding, arch, trim — zero traces.\n"
            f"2. INSTALL the new door exactly as described — same color, panels, finish, hardware.\n"
            f"3. Align door base flush with the floor line.\n"
            f"4. Match room perspective, lighting direction, and ambient warmth.\n"
            f"5. Add natural contact shadow where door base meets floor.\n"
            f"6. Blend door frame edges seamlessly into wall — no halo, no hard lines.\n"
            f"7. KEEP everything outside the mask area PIXEL-PERFECT identical.\n"
            f"8. Result must look like a real photograph taken by a professional camera.\n"
            f"9. Door handle/knob must be on the CORRECT side matching the room photo.\n"
            f"10. CRITICAL: Do NOT stretch, elongate, or alter door proportions vertically."
        )

    # ── Background Removal ────────────────────────────────────────────────

    @staticmethod
    def process_product_background(product):
        """
        HD Background Removal Pipeline:
        1. Photoroom API (best quality, if configured)
        2. rembg u2net (fast local fallback)
        """
        import io
        import numpy as np
        from PIL import Image as PILImage, ImageOps
        from .models import Product, SystemSettings

        try:
            product      = Product.objects.get(id=product.id)
            settings_obj = SystemSettings.get_solo()

            if not settings_obj.enable_bg_removal:
                product.ai_status = "completed"
                product.save(update_fields=["ai_status"])
                return

            print(f"DEBUG: [AI Service] BG removal for product {product.id}...")
            product.ai_status = "processing"
            product.save(update_fields=["ai_status"])

            # Save original image
            if not product.original_image:
                product.image.seek(0)
                original_content = product.image.read()
                name = os.path.basename(product.image.name)
                product.original_image.save(name, ContentFile(original_content), save=False)
                product.save(update_fields=["original_image"])

            product.original_image.seek(0)
            input_bytes = product.original_image.read()

            # Fix EXIF orientation + convert to clean PNG
            img_pil = PILImage.open(io.BytesIO(input_bytes))
            img_pil = ImageOps.exif_transpose(img_pil).convert("RGBA")
            prep_buf = io.BytesIO()
            img_pil.save(prep_buf, format="PNG")
            input_bytes_cleaned = prep_buf.getvalue()

            output_image_bytes = None
            method_used        = "none"

            # Background removal via rembg
            if not output_image_bytes:
                try:
                    from rembg import remove as rembg_remove
                    print(f"DEBUG: [AI Service] Using rembg for product {product.id}...")
                    output_image_bytes = rembg_remove(input_bytes_cleaned)
                    method_used = "rembg"
                except Exception as e:
                    print(f"WARNING: [AI Service] rembg failed: {e}")

            if not output_image_bytes:
                output_image_bytes = input_bytes_cleaned
                method_used        = "original"

            # Refine mask
            import cv2
            tmp_res    = PILImage.open(io.BytesIO(output_image_bytes)).convert("RGBA")
            tmp_alpha  = np.array(tmp_res)[:, :, 3]
            perfect_mask = refine_product_mask(tmp_alpha) if tmp_alpha is not None else tmp_alpha
            if perfect_mask is None:
                perfect_mask = tmp_alpha

            src_np         = np.array(img_pil)
            src_np[:, :, 3] = perfect_mask

            final_buf = io.BytesIO()
            PILImage.fromarray(src_np).save(final_buf, format="PNG")
            final_bytes = final_buf.getvalue()

            product.image.save(f"hd_isolated_{product.id}.png", ContentFile(final_bytes), save=False)
            product.image_no_bg.save(f"hd_trans_{product.id}.png", ContentFile(final_bytes), save=False)
            product.ai_status = "completed"
            product.ai_error  = ""
            product.save()
            print(f"DEBUG: [AI Service] BG removal done — method: {method_used}")

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"ERROR: [AI Service] BG removal failed: {error_details}")
            try:
                with open("ai_debug.log", "a+") as f:
                    f.write(f"\n--- ERROR product {product.id} ---\n{error_details}\n")
            except Exception:
                pass
            product.ai_status = "error"
            product.ai_error  = str(error_details)[:500]
            product.save(update_fields=["ai_status", "ai_error"])

    # ── Main Visualization Pipeline ───────────────────────────────────────

    @staticmethod
    def generate_room_preview(product, room_image_path, result_image_path):
        """
        GPT Image 2 door replacement pipeline.

        STEP 1 — Detect door  : GPT-4o vision  →  YOLO  →  OpenCV  →  default
        STEP 2 — Describe door : GPT-4o vision generates detailed description
        STEP 3 — Build mask   : RGBA mask (transparent = edit zone)
        STEP 4 — AI Edit      : gpt-image-2 inpainting
        STEP 5 — Validate     : locked-scene check (room outside door unchanged)
        STEP 6 — Fallback     : OpenCV composite if AI fails or is rejected
        """
        import cv2
        import numpy as np
        from PIL import Image as PILImage
        from .ai_utils import save_visualization_metadata

        print(f"\n{'='*60}")
        print(f"[Pipeline] GPT Image 2 — product {product.id}")
        print(f"{'='*60}")

        # ── Load room ──────────────────────────────────────────────────────
        room_bgr = cv2.imread(room_image_path, cv2.IMREAD_COLOR)
        if room_bgr is None:
            raise ValueError("Room rasmi yuklanmadi")
        h, w = room_bgr.shape[:2]
        room_pil = PILImage.fromarray(cv2.cvtColor(room_bgr, cv2.COLOR_BGR2RGB))

        # ── Load door asset ────────────────────────────────────────────────
        door_rgba = load_best_door_rgba(product)
        expected_aspect_ratio = get_expected_door_aspect_ratio(product, door_rgba=door_rgba)

        preview_metadata = {
            "pipeline": {
                "version": "gpt_image_2_v1",
                "engine": "gpt-image-2",
            }
        }

        # ── STEP 1: Door Detection ─────────────────────────────────────────
        print("\n[Step 1] Door detection...")
        _, room_buf = cv2.imencode(".png", room_bgr)
        room_bytes  = room_buf.tobytes()

        master_box       = None
        detection_method = "unknown"

        # Primary: GPT-4o
        try:
            gpt_box = AIService.detect_door_box_with_gpt4o(room_bytes, w, h)
            if gpt_box:
                master_box       = gpt_box
                detection_method = "gpt-4o"
        except Exception as e:
            print(f"WARNING: [Step 1] GPT-4o detection failed: {e}")

        # Fallback: YOLO → OpenCV → default
        if not master_box:
            print("[Step 1] Falling back to structural detection...")
            detected_box, detection_method = detect_door_opening_box(room_bgr, expected_aspect_ratio)
            master_box = expand_pixel_box_top_heavy(
                detected_box, w, h,
                pad_x_ratio=0.08, pad_top_ratio=0.28, pad_bottom_ratio=0.02,
            )

        x1, y1, x2, y2 = master_box
        print(f"[Step 1] ✅ Box: ({x1},{y1})–({x2},{y2})  method: {detection_method}")
        preview_metadata["pipeline"]["detection_method"] = detection_method
        preview_metadata["pipeline"]["master_box"]       = list(master_box)

        # ── STEP 2: Door Visual Description ───────────────────────────────
        print("\n[Step 2] Describing door with GPT-4o...")
        door_description = None
        door_ref_path    = None
        for attr in ("original_image", "image", "image_no_bg"):
            field = getattr(product, attr, None)
            if field and getattr(field, "name", ""):
                try:
                    p = field.path
                    if os.path.exists(p):
                        door_ref_path = p
                        break
                except Exception:
                    pass

        if door_ref_path:
            door_description = AIService.describe_door_with_gpt4o(door_ref_path)

        if door_description:
            print(f"[Step 2] ✅ Description obtained ({len(door_description)} chars)")
        else:
            print("[Step 2] ⚠️  No description — using product name only")

        # ── STEP 3: Build Mask ─────────────────────────────────────────────
        print("\n[Step 3] Building mask...")
        mask_pil = AIService.build_gpt_image_2_mask(w, h, master_box)

        # ── STEP 4a: GPT Image 2 — faqat eski eshikni o'chir, devorni to'ldir ──
        # Yangi eshikni BU YERDA CHIZMAYMIZ — faqat toza devor kerak.
        # Haqiqiy mahsulot rasmi keyingi bosqichda OpenCV bilan qo'yiladi.
        print("\n[Step 4a] GPT Image 2 — wall fill (old door removal)...")
        wall_fill_prompt = (
            "You are a professional photo retoucher. Task: door removal only.\n\n"
            "REMOVE the door in the transparent mask area completely — "
            "leaf, frame, molding, architrave, hinges — zero traces.\n"
            "FILL the opening with seamless wall matching the surroundings exactly:\n"
            "- Same paint color, sheen, and texture as the adjacent wall\n"
            "- Continue any baseboard or skirting board at floor level\n"
            "- No door shape, no shadow of old door — perfectly clean wall\n"
            "KEEP everything outside the mask PIXEL-PERFECT identical.\n"
            "Result: a room photo as if a door never existed there."
        )
        cleaned_room_pil = None
        try:
            cleaned_room_pil = AIService.edit_room_with_gpt_image_2(
                room_pil, mask_pil, wall_fill_prompt
            )
            print("[Step 4a] ✅ Wall fill successful")
            preview_metadata["pipeline"]["wall_fill"] = "gpt-image-2"
        except Exception as e:
            print(f"WARNING: [Step 4a] Wall fill failed: {e} — using TELEA fallback")
            preview_metadata["pipeline"]["wall_fill"] = "opencv-telea"

        # ── STEP 4b: OpenCV — haqiqiy mahsulot rasmini aniq joylashtirish ──
        # Bu bosqich KAFOLATLANADI: har doim mijoz tanlagan eshik ko'rinadi.
        print("\n[Step 4b] OpenCV composite — placing exact product door...")
        if cleaned_room_pil is not None:
            cleaned_bgr = cv2.cvtColor(np.array(cleaned_room_pil), cv2.COLOR_RGB2BGR)
            if cleaned_bgr.shape[:2] != (h, w):
                cleaned_bgr = cv2.resize(cleaned_bgr, (w, h), interpolation=cv2.INTER_LINEAR)
        else:
            # gpt-image-2 fail bo'lsa — TELEA inpainting bilan devor tozalanadi
            inpaint_box = expand_pixel_box_top_heavy(
                master_box, w, h,
                pad_x_ratio=0.05, pad_top_ratio=0.25, pad_bottom_ratio=0.02,
            )
            cleaned_bgr = remove_door_from_room_locally(room_bgr, inpaint_box)

        # Mahsulot rasmiga xona yorug'ligini moslashtirish
        lit_door_rgba = match_door_lighting_to_room(door_rgba, cleaned_bgr, master_box)

        # Haqiqiy mahsulot rasmini xonaga qo'yish (alpha compositing)
        composite = overlay_door_into_room(
            cleaned_bgr, lit_door_rgba, master_box, add_shadow=True
        )
        placed_box = compute_floor_aligned_door_box(master_box, lit_door_rgba, w, h)
        composite  = add_floor_contact_shadow(composite, placed_box, strength=0.22)

        preview_metadata["pipeline"]["composite"] = "opencv"
        preview_metadata["pipeline"]["inpaint_model"] = "hybrid"

        cv2.imwrite(result_image_path, composite)
        save_visualization_metadata(result_image_path, preview_metadata)
        print(f"\n[Pipeline] ✅ Hybrid result saved → {result_image_path}")
        return result_image_path

    @staticmethod
    def refine_corners_with_mask(detected_box, wall_mask, room_bgr):
        import cv2
        import numpy as np

        x1, y1, x2, y2 = detected_box
        h, w = wall_mask.shape[:2]
        pad_w = int((x2 - x1) * 0.2)
        pad_h = int((y2 - y1) * 0.2)
        roi_x1, roi_y1 = max(0, x1 - pad_w), max(0, y1 - pad_h)
        roi_x2, roi_y2 = min(w, x2 + pad_w), min(h, y2 + pad_h)

        mask_roi = (wall_mask[roi_y1:roi_y2, roi_x1:roi_x2] * 255).astype(np.uint8)
        contours, _ = cv2.findContours(mask_roi, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return {"top_left":(x1,y1),"top_right":(x2,y1),"bottom_right":(x2,y2),"bottom_left":(x1,y2)}

        cnt     = max(contours, key=cv2.contourArea)
        epsilon = 0.05 * cv2.arcLength(cnt, True)
        approx  = cv2.approxPolyDP(cnt, epsilon, True)

        if len(approx) == 4:
            pts = approx.reshape(4, 2)
            pts[:, 0] += roi_x1
            pts[:, 1] += roi_y1
            pts        = pts[np.argsort(pts[:, 1])]
            top_pts    = pts[:2][np.argsort(pts[:2, 0])]
            bottom_pts = pts[2:][np.argsort(pts[2:, 0])[::-1]]
            return {
                "top_left":     tuple(top_pts[0]),
                "top_right":    tuple(top_pts[1]),
                "bottom_right": tuple(bottom_pts[0]),
                "bottom_left":  tuple(bottom_pts[1]),
            }
        return {"top_left":(x1,y1),"top_right":(x2,y1),"bottom_right":(x2,y2),"bottom_left":(x1,y2)}


# ═════════════════════════════════════════════════════════════════════════════
#  SECTION 6 — WISHLIST SERVICE  (unchanged)
# ═════════════════════════════════════════════════════════════════════════════

class WishlistService:
    """Service layer for wishlist operations."""

    @staticmethod
    def toggle(user, product):
        from shop.models import Wishlist
        item, created = Wishlist.objects.get_or_create(user=user, product=product)
        if not created:
            item.delete()
            return False
        return True

    @staticmethod
    def is_wishlisted(user_id, product_id):
        from shop.models import Wishlist
        return Wishlist.objects.filter(user_id=user_id, product_id=product_id).exists()

    @staticmethod
    def get_user_wishlist(user):
        from shop.models import Wishlist
        return Wishlist.objects.filter(user=user).select_related(
            "product", "product__category", "product__company"
        )
    