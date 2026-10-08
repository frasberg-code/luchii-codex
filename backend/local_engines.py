"""Luchii in-house engines: Piper (voice), faster-whisper (transcription), SD-Turbo (images). CPU only."""
import base64
import io
import logging
import os
import threading
import wave
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger("luchii.local")
MODELS_DIR = Path(os.environ["LUCHII_MODELS_DIR"])
MODELS_DIR.mkdir(parents=True, exist_ok=True)

PIPER_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"
PIPER_VOICES = {
    "nova": "en_US-amy-medium", "alloy": "en_US-lessac-medium", "echo": "en_US-ryan-medium",
    "fable": "en_GB-alan-medium", "onyx": "en_US-joe-medium", "shimmer": "en_US-kristin-medium",
    "sage": "en_US-hfc_female-medium", "coral": "en_GB-jenny_dioco-medium", "ash": "en_US-hfc_male-medium",
}
IMAGE_MODEL = "stabilityai/sd-turbo"
ASPECTS = {"1:1": (512, 512), "16:9": (640, 384), "9:16": (384, 640), "4:3": (576, 448), "3:4": (448, 576)}

_voices: dict = {}
_whisper = None
_t2i = None
_i2i = None
_voice_lock = threading.Lock()
_image_lock = threading.Lock()
_stt_lock = threading.Lock()


# ---------- voice ----------
def _piper_file(name: str, ext: str) -> Path:
    lang, speaker, quality = name.split("-")
    path = MODELS_DIR / "piper" / f"{name}.{ext}"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        url = f"{PIPER_BASE}/{lang.split('_')[0]}/{lang}/{speaker}/{quality}/{name}.{ext}"
        logger.info("Downloading Piper voice %s", url)
        with httpx.stream("GET", url, follow_redirects=True, timeout=300) as r:
            r.raise_for_status()
            tmp = path.with_suffix(path.suffix + ".part")
            with open(tmp, "wb") as f:
                for chunk in r.iter_bytes():
                    f.write(chunk)
            tmp.rename(path)
    return path


def _voice(voice: str):
    from piper import PiperVoice
    name = PIPER_VOICES.get(voice, PIPER_VOICES["nova"])
    if name not in _voices:
        _piper_file(name, "onnx.json")
        _voices[name] = PiperVoice.load(str(_piper_file(name, "onnx")))
    return _voices[name]


def synthesize(text: str, voice: str = "nova") -> dict:
    with _voice_lock:
        v = _voice(voice)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            if hasattr(v, "synthesize_wav"):
                v.synthesize_wav(text, wf)
            else:
                v.synthesize(text, wf)
    return {"audio_base64": base64.b64encode(buf.getvalue()).decode(), "mime": "audio/wav"}


# ---------- transcription ----------
def transcribe(data: bytes) -> str:
    global _whisper
    with _stt_lock:
        if _whisper is None:
            from faster_whisper import WhisperModel
            _whisper = WhisperModel("base", device="cpu", compute_type="int8", download_root=str(MODELS_DIR / "whisper"))
        segments, _ = _whisper.transcribe(io.BytesIO(data), vad_filter=True)
        return " ".join(s.text.strip() for s in segments).strip()


# ---------- images ----------
def _pipes():
    global _t2i, _i2i
    if _t2i is None:
        import torch
        from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image
        torch.set_num_threads(max(1, (os.cpu_count() or 4) - 2))
        _t2i = AutoPipelineForText2Image.from_pretrained(IMAGE_MODEL, torch_dtype=torch.float32,
                                                         cache_dir=str(MODELS_DIR / "hf"))
        _t2i.set_progress_bar_config(disable=True)
        _i2i = AutoPipelineForImage2Image.from_pipe(_t2i)
        _i2i.set_progress_bar_config(disable=True)
    return _t2i, _i2i


def warm_up():
    try:
        _voice("nova")
        with _image_lock:
            _pipes()
        logger.info("Luchii in-house engines loaded")
    except Exception:  # noqa: BLE001
        logger.exception("Luchii in-house engine warm-up failed")


def _to_data_url(img) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def _load_image(b64: str, longest: int):
    from PIL import Image
    raw = base64.b64decode(b64.split(",", 1)[1] if b64.startswith("data:") else b64)
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    scale = longest / max(img.size)
    w, h = (max(64, int(d * scale) // 64 * 64) for d in img.size)
    return img.resize((w, h), Image.LANCZOS)


def generate_image(prompt: str, aspect: Optional[str] = "1:1") -> str:
    w, h = ASPECTS.get(aspect or "1:1", ASPECTS["1:1"])
    with _image_lock:
        t2i, _ = _pipes()
        img = t2i(prompt=prompt, num_inference_steps=1, guidance_scale=0.0, width=w, height=h).images[0]
    return _to_data_url(img)


def edit_image(prompt: str, image_b64: str, strength: float = 0.6, longest: int = 512) -> str:
    src = _load_image(image_b64, longest)
    steps = max(2, int(round(1 / strength)) + 1)
    with _image_lock:
        _, i2i = _pipes()
        img = i2i(prompt=prompt, image=src, num_inference_steps=steps, strength=strength, guidance_scale=0.0).images[0]
    return _to_data_url(img)


def upscale_image(image_b64: str) -> str:
    return edit_image("high resolution, sharp fine detail, crisp, best quality", image_b64, strength=0.3, longest=768)


def status() -> dict:
    voice_ready = any((MODELS_DIR / "piper").glob("*.onnx")) if (MODELS_DIR / "piper").exists() else False
    image_ready = (MODELS_DIR / "hf").exists() and any((MODELS_DIR / "hf").rglob("*.safetensors"))
    return {"voice_downloaded": voice_ready, "image_downloaded": image_ready, "image_loaded": _t2i is not None}
