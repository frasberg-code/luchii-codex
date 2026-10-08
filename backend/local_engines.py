"""Luchii in-house engines: Piper (voice), faster-whisper (STT), SD-Turbo (images), Shap-E (3D), OpenVoice (voice conversion). CPU only."""
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
SCRATCH_MODELS_DIR = Path(os.environ["LUCHII_SCRATCH_MODELS_DIR"])
SCRATCH_MODELS_DIR.mkdir(parents=True, exist_ok=True)
OPENVOICE_REPO = "myshell-ai/OpenVoiceV2"
SHAPE_MODEL = "openai/shap-e"
SHAPE_STEPS = 10


def cpu_threads() -> int:
    try:
        quota, period = open("/sys/fs/cgroup/cpu.max").read().split()
        if quota != "max":
            return max(1, int(int(quota) / int(period)))
    except (OSError, ValueError):
        pass
    return max(1, (os.cpu_count() or 4) - 2)

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
_shape = None
_converter = None
_shape_lock = threading.Lock()
_convert_lock = threading.Lock()


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
        torch.set_num_threads(cpu_threads())
        _t2i = AutoPipelineForText2Image.from_pretrained(IMAGE_MODEL, torch_dtype=torch.float32,
                                                         cache_dir=str(MODELS_DIR / "hf"))
        _t2i.set_progress_bar_config(disable=True)
        _i2i = AutoPipelineForImage2Image.from_pipe(_t2i)
        _i2i.set_progress_bar_config(disable=True)
    return _t2i, _i2i


def warm_up():
    try:
        _voice("nova")
        _openvoice()
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


def image_busy() -> bool:
    return _image_lock.locked()


def status() -> dict:
    voice_ready = any((MODELS_DIR / "piper").glob("*.onnx")) if (MODELS_DIR / "piper").exists() else False
    image_ready = (MODELS_DIR / "hf").exists() and any((MODELS_DIR / "hf").rglob("*.safetensors"))
    shape_ready = (SCRATCH_MODELS_DIR / "hf").exists() and any((SCRATCH_MODELS_DIR / "hf").rglob("*.bin"))
    return {"voice_downloaded": voice_ready, "image_downloaded": image_ready, "image_loaded": _t2i is not None,
            "shape_downloaded": shape_ready, "shape_loaded": _shape is not None, "converter_loaded": _converter is not None}


# ---------- 3D ----------
def _shape_pipe():
    global _shape
    if _shape is None:
        import torch
        from diffusers import ShapEPipeline, DPMSolverMultistepScheduler
        torch.set_num_threads(cpu_threads())
        pipe = ShapEPipeline.from_pretrained(SHAPE_MODEL, torch_dtype=torch.float32,
                                             cache_dir=str(SCRATCH_MODELS_DIR / "hf"))
        pipe.scheduler = DPMSolverMultistepScheduler(
            num_train_timesteps=1024, trained_betas=pipe.scheduler.betas.numpy(), prediction_type="sample",
            algorithm_type="dpmsolver++", use_karras_sigmas=True)
        pipe.set_progress_bar_config(disable=True)
        _shape = pipe
    return _shape


def generate_3d(prompt: str) -> bytes:
    import numpy as np
    import trimesh
    with _shape_lock:
        pipe = _shape_pipe()
        latents = pipe(prompt, guidance_scale=15.0, num_inference_steps=SHAPE_STEPS, output_type="latent").images
        mesh = pipe.shap_e_renderer.decode_to_mesh(latents[0, None], "cpu")
    verts = mesh.verts.cpu().numpy()[:, [0, 2, 1]] * [1, 1, -1]
    colors = np.stack([mesh.vertex_channels[k].cpu().numpy() for k in "RGB"], 1)
    tm = trimesh.Trimesh(vertices=verts, faces=mesh.faces.cpu().numpy(),
                         vertex_colors=(colors * 255).clip(0, 255).astype("uint8"))
    return tm.export(file_type="glb")


# ---------- voice conversion ----------
def _openvoice():
    global _converter
    if _converter is None:
        import sys
        from huggingface_hub import hf_hub_download
        sys.path.insert(0, str(Path(__file__).parent / "vendor"))
        from openvoice.api import ToneColorConverter
        root = MODELS_DIR / "openvoice"
        cfg = hf_hub_download(OPENVOICE_REPO, "converter/config.json", local_dir=str(root))
        ckpt = hf_hub_download(OPENVOICE_REPO, "converter/checkpoint.pth", local_dir=str(root))
        conv = ToneColorConverter(cfg, device="cpu")
        conv.load_ckpt(ckpt)
        _converter = conv
    return _converter


def _to_wav_file(data: bytes, path: Path, rate: int = 22050) -> float:
    import av
    import numpy as np
    import soundfile
    chunks = []
    with av.open(io.BytesIO(data)) as container:
        resampler = av.AudioResampler(format="flt", layout="mono", rate=rate)
        for frame in container.decode(audio=0):
            for f in resampler.resample(frame):
                chunks.append(f.to_ndarray().reshape(-1))
        for f in resampler.resample(None):
            chunks.append(f.to_ndarray().reshape(-1))
    audio = np.concatenate(chunks) if chunks else np.zeros(0, dtype="float32")
    soundfile.write(str(path), audio, rate)
    return len(audio) / rate


def audio_duration(data: bytes) -> float:
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        return round(_to_wav_file(data, Path(tmp) / "a.wav"), 1)


def speak_cloned(text: str, reference: bytes, base_voice: str = "nova") -> dict:
    import tempfile
    base = base64.b64decode(synthesize(text, base_voice)["audio_base64"])
    with _convert_lock, tempfile.TemporaryDirectory() as tmp:
        conv = _openvoice()
        src, ref, out = Path(tmp) / "src.wav", Path(tmp) / "ref.wav", Path(tmp) / "out.wav"
        src.write_bytes(base)
        _to_wav_file(reference, ref, conv.hps.data.sampling_rate)
        src_se = conv.extract_se([str(src)])
        tgt_se = conv.extract_se([str(ref)])
        conv.convert(audio_src_path=str(src), src_se=src_se, tgt_se=tgt_se, output_path=str(out))
        return {"audio_base64": base64.b64encode(out.read_bytes()).decode(), "mime": "audio/wav"}


def busy_3d() -> bool:
    return _shape_lock.locked()
