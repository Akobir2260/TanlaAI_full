"""
GPT Image 2 Door Visualization — utility helpers and legacy entry point.
The main pipeline lives in AIService.generate_room_preview() (services.py).
"""
import os
import io
import json
import base64
from PIL import Image
from openai import OpenAI
from django.conf import settings


def log_error(msg):
    import time
    try:
        with open('ai_error.log', 'a') as f:
            f.write(f"[{time.ctime()}] {msg}\n")
    except:
        pass
    print(msg)


def load_visualization_metadata(image_path):
    """Load optional JSON sidecar metadata for a generated visualization."""
    if not image_path:
        return None

    metadata_path = f"{image_path}.json"
    if not os.path.exists(metadata_path):
        return None

    try:
        with open(metadata_path, 'r', encoding='utf-8') as fh:
            data = json.load(fh)
        return data if isinstance(data, dict) else None
    except Exception as exc:
        log_error(f"Failed to load visualization metadata for {image_path}: {exc}")
        return None


def save_visualization_metadata(image_path, metadata):
    """Persist optional JSON sidecar metadata next to a generated visualization."""
    if not image_path or not metadata:
        return

    metadata_path = f"{image_path}.json"
    try:
        with open(metadata_path, 'w', encoding='utf-8') as fh:
            json.dump(metadata, fh, ensure_ascii=False, indent=2)
    except Exception as exc:
        log_error(f"Failed to save visualization metadata for {image_path}: {exc}")


def _get_openai_client():
    """Get OpenAI client with API key from settings."""
    api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.environ.get('OPENAI_API_KEY', '')
    if not api_key or not str(api_key).strip().startswith('sk-'):
        raise ValueError(f"OpenAI API key not found or invalid")
    return OpenAI(api_key=api_key.strip())


def _encode_image_for_gpt(image_path, max_size=800):
    """Encode an image to base64 for GPT-4o, with size limit."""
    with Image.open(image_path) as img:
        img.thumbnail((max_size, max_size))
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=80)
        return base64.b64encode(buf.getvalue()).decode('utf-8')


def visualize_door_in_room(product, room_image_path, result_image_path, box_1000=None, override_prompt=None):
    """
    GPT Image 2 door replacement — delegates to AIService.generate_room_preview().
    box_1000 and override_prompt are accepted for API compatibility but unused;
    AIService handles detection and prompt building internally.
    """
    # Lazy import avoids circular dependency (services.py imports from this module)
    from shop.services import AIService
    return AIService.generate_room_preview(product, room_image_path, result_image_path)
