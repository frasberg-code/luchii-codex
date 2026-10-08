from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

import asyncio
import os
import re
import time
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import httpx
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, Form
import base64
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

import local_engines

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
fs = AsyncIOMotorGridFSBucket(db, bucket_name="voice_samples")
takes_fs = AsyncIOMotorGridFSBucket(db, bucket_name="voice_takes")
models_fs = AsyncIOMotorGridFSBucket(db, bucket_name="models3d")
media_fs = AsyncIOMotorGridFSBucket(db, bucket_name="media")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
FRASBERG_BASE = os.environ["FRASBERG_BASE_URL"].rstrip("/")
FRASBERG_KEYS = [k.strip() for k in os.environ["FRASBERG_API_KEYS"].split(",") if k.strip()]
KEY_ROUTES = {f: p.split("|") for f, p in (r.split(":") for r in os.environ["FRASBERG_KEY_ROUTES"].split(","))}


def key_order(feature: Optional[str]) -> list:
    prefs = KEY_ROUTES.get(feature or "", [])
    first = [i for p in prefs for i, k in enumerate(FRASBERG_KEYS) if k.startswith(f"frb_live_{p}")]
    return first + [i for i in range(len(FRASBERG_KEYS)) if i not in first]

STYLE_HINTS = {
    "cinematic": "cinematic film still, anamorphic lens, dramatic rim lighting, teal and cyan color grade, volumetric light, shallow depth of field, 8k, masterpiece",
    "photorealistic": "photorealistic, ultra detailed, natural soft light, 85mm lens, sharp focus, high dynamic range, award-winning photography",
    "3d": "3D render, octane render, glossy physically based materials, studio lighting, cyan and violet accents, ultra detailed",
    "anime": "anime key visual, vibrant cel shading, clean line art, luminous colors, detailed background, studio quality",
    "digital-art": "digital art, highly detailed concept illustration, vivid cyan and violet palette, glowing highlights, trending on artstation",
    "product": "luxury product photography, seamless studio backdrop, softbox lighting, crisp reflections, commercial advertising shot",
}
UPSCALE_PRESET = "Enhance and upscale this image to crisp 4K detail, preserving the original composition and colors"

app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger("luchii")
logging.basicConfig(level=logging.INFO)


# ---------- helpers ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except ValueError:
        return False


def make_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def public_user(u: dict) -> dict:
    return {"id": u["id"], "name": u.get("name", ""), "email": u["email"]}


async def optional_user(request: Request) -> Optional[dict]:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    try:
        payload = jwt.decode(auth[7:], JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        return None
    return await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})


async def current_user(user: Optional[dict] = Depends(optional_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def as_data_url(b64: str, mime: str = "image/png") -> str:
    return b64 if b64.startswith("data:") else f"data:{mime};base64,{b64}"


def strip_data_url(s: str) -> str:
    return s.split(",", 1)[1] if s.startswith("data:") else s


def upstream_detail(r: httpx.Response) -> str:
    try:
        d = r.json()
    except ValueError:
        return f"Frasberg server returned HTTP {r.status_code} (Bad Gateway)" if r.status_code == 502 else f"Frasberg returned HTTP {r.status_code}"
    det = d.get("detail") if isinstance(d, dict) else None
    if isinstance(det, dict):
        return det.get("message") or str(det)
    if isinstance(det, str):
        return det
    err = d.get("error") if isinstance(d, dict) else None
    if isinstance(err, dict):
        return err.get("message") or str(err)
    return f"Frasberg returned HTTP {r.status_code}"


async def frasberg(method: str, path: str, json: Optional[dict] = None, key_index: Optional[int] = None,
                   feature: Optional[str] = None):
    """Call Frasberg, rotating through keys on permission / server errors. Returns (response, key_index)."""
    order = [key_index] if key_index is not None else key_order(feature)
    last, best = "Frasberg is unavailable", None
    async with httpx.AsyncClient(timeout=180) as hc:
        for i in order:
            try:
                r = await hc.request(method, f"{FRASBERG_BASE}{path}", json=json,
                                     headers={"Authorization": f"Bearer {FRASBERG_KEYS[i]}"})
            except httpx.HTTPError as e:
                last = f"Frasberg connection error: {e.__class__.__name__}"
                continue
            if r.status_code < 400:
                return r, i
            last = upstream_detail(r)
            if r.status_code != 403:
                best = last
            logger.warning("Frasberg %s %s key#%s -> %s %s", method, path, i, r.status_code, last)
            if r.status_code in (400, 404, 422) or r.status_code >= 500:
                break
    raise HTTPException(status_code=424, detail=f"Frasberg: {best or last}")


async def frasberg_image(payload: dict) -> str:
    r, _ = await frasberg("POST", "/generate/image", payload, feature="image")
    d = r.json()
    b64 = d.get("image_base64") or d.get("image") or (d.get("data") or [{}])[0].get("b64_json")
    if not b64:
        raise HTTPException(status_code=424, detail="Frasberg returned no image")
    return as_data_url(b64, d.get("mime") or "image/png")


async def image_with_fallback(frasberg_payload: dict, local_fn, *args) -> tuple:
    try:
        return await frasberg_image(frasberg_payload), "frasberg"
    except HTTPException as e:
        logger.warning("Frasberg image failed (%s); using Luchii in-house image engine", e.detail)
    if local_engines.image_busy():
        raise HTTPException(status_code=429, detail="Luchii is finishing another image. Yours is in the queue.",
                            headers={"Retry-After": "8"})
    try:
        return await asyncio.to_thread(local_fn, *args), "luchii-local"
    except Exception as e:  # noqa: BLE001
        logger.exception("Local image engine failed")
        raise HTTPException(status_code=424, detail=f"Luchii image engine error: {e.__class__.__name__}")


async def speak_with_fallback(text: str, voice: Optional[str]) -> dict:
    try:
        return {**(await speak(text, voice)), "engine": "frasberg"}
    except HTTPException as e:
        logger.warning("Frasberg voice failed (%s); using Luchii in-house voice engine", e.detail)
    try:
        return {**(await asyncio.to_thread(local_engines.synthesize, text, voice or "nova")), "engine": "luchii-local"}
    except Exception as e:  # noqa: BLE001
        logger.exception("Local voice engine failed")
        raise HTTPException(status_code=424, detail=f"Luchii voice engine error: {e.__class__.__name__}")


async def save_generation(kind: str, prompt: str, image: str, session_id: Optional[str],
                          user: Optional[dict], style: Optional[str] = None, aspect: Optional[str] = None) -> dict:
    doc = {
        "id": str(uuid.uuid4()), "kind": kind, "prompt": prompt, "style": style,
        "aspect_ratio": aspect, "image_base64": image, "session_id": session_id,
        "user_id": user["id"] if user else None, "author": user.get("name") if user else None,
        "created_at": now_iso(),
    }
    await db.generations.insert_one(doc.copy())
    return doc


# ---------- models ----------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class GenerateIn(BaseModel):
    prompt: str = Field(min_length=1)
    style: Optional[str] = "cinematic"
    aspect_ratio: Optional[str] = "1:1"
    session_id: Optional[str] = None


class EditIn(BaseModel):
    prompt: str = Field(min_length=1)
    image_base64: str
    session_id: Optional[str] = None


class UpscaleIn(BaseModel):
    image_base64: str
    prompt: Optional[str] = "Upscaled"
    session_id: Optional[str] = None


class TTSIn(BaseModel):
    text: str = Field(min_length=1, max_length=4096)
    voice: str = "nova"
    hd: bool = False


# ---------- routes ----------
@api.get("/")
async def root():
    return {"message": "Luchii API is running"}


@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {"id": str(uuid.uuid4()), "name": body.name.strip(), "email": email,
            "password_hash": hash_password(body.password), "created_at": now_iso()}
    await db.users.insert_one(user.copy())
    return {"token": make_token(user["id"], email), "user": public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn):
    email = body.email.lower()
    ident = email
    att = await db.login_attempts.find_one({"identifier": ident})
    if att and att.get("count", 0) >= 5 and att.get("locked_until", "") > now_iso():
        raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1},
             "$set": {"locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": ident})
    return {"token": make_token(user["id"], email), "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(current_user)):
    return public_user(user)


@api.post("/generate")
async def generate(body: GenerateIn, user: Optional[dict] = Depends(optional_user)):
    hint = STYLE_HINTS.get(body.style or "", "")
    full = f"{body.prompt}. {hint}. Aspect ratio {body.aspect_ratio}." if hint else body.prompt
    img, engine = await image_with_fallback({"prompt": full, "style": body.style, "aspect_ratio": body.aspect_ratio},
                                            local_engines.generate_image, full, body.aspect_ratio)
    doc = await save_generation("generate", body.prompt, img, body.session_id, user, body.style, body.aspect_ratio)
    return {"id": doc["id"], "image_base64": img, "prompt": body.prompt, "style": body.style, "engine": engine}


@api.post("/edit")
async def edit(body: EditIn, user: Optional[dict] = Depends(optional_user)):
    img, engine = await image_with_fallback({"prompt": body.prompt, "image_base64": strip_data_url(body.image_base64)},
                                            local_engines.edit_image, body.prompt, body.image_base64)
    doc = await save_generation("edit", body.prompt, img, body.session_id, user, "Remix")
    return {"id": doc["id"], "image_base64": img, "prompt": body.prompt, "engine": engine}


@api.post("/upscale")
async def upscale(body: UpscaleIn, user: Optional[dict] = Depends(optional_user)):
    img, engine = await image_with_fallback({"prompt": UPSCALE_PRESET, "image_base64": strip_data_url(body.image_base64)},
                                            local_engines.upscale_image, body.image_base64)
    doc = await save_generation("upscale", body.prompt or "Upscaled", img, body.session_id, user, "Upscale 4K")
    return {"id": doc["id"], "image_base64": img, "prompt": body.prompt, "engine": engine}


@api.post("/tts")
async def tts(body: TTSIn):
    return {**(await speak_with_fallback(body.text, body.voice)), "voice": body.voice}


@api.get("/generations")
async def generations(session_id: str, limit: int = 8):
    cur = db.generations.find({"session_id": session_id, "image_base64": {"$ne": None}}, {"_id": 0})
    return await cur.sort("created_at", -1).limit(min(limit, 60)).to_list(None)


@api.get("/my/generations")
async def my_generations(limit: int = 60, user: dict = Depends(current_user)):
    cur = db.generations.find({"user_id": user["id"], "image_base64": {"$ne": None}}, {"_id": 0})
    return await cur.sort("created_at", -1).limit(min(limit, 200)).to_list(None)


@api.get("/showcase")
async def showcase(limit: int = 8):
    cur = db.generations.find({"kind": "generate", "featured": True, "image_base64": {"$ne": None}},
                              {"_id": 0, "id": 1, "prompt": 1, "style": 1, "image_base64": 1})
    return await cur.sort("created_at", -1).limit(min(limit, 24)).to_list(None)


@api.get("/share/{gen_id}")
async def share(gen_id: str):
    doc = await db.generations.find_one({"id": gen_id},
                                        {"_id": 0, "id": 1, "prompt": 1, "style": 1, "image_base64": 1, "author": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


async def frasberg_upload(path: str, filename: str, data: bytes, ctype: str, feature: str) -> dict:
    last, best = "Frasberg is unavailable", None
    async with httpx.AsyncClient(timeout=120) as hc:
        for i in key_order(feature):
            try:
                r = await hc.post(f"{FRASBERG_BASE}{path}", headers={"Authorization": f"Bearer {FRASBERG_KEYS[i]}"},
                                  files={"file": (filename, data, ctype)})
            except httpx.HTTPError as e:
                last = f"Frasberg connection error: {e.__class__.__name__}"
                continue
            if r.status_code < 400:
                return r.json()
            last = upstream_detail(r)
            if r.status_code != 403:
                best = last
            logger.warning("Frasberg upload %s key#%s -> %s %s", path, i, r.status_code, last)
            if r.status_code in (400, 413, 422) or r.status_code >= 500:
                break
    raise HTTPException(status_code=424, detail=f"Frasberg: {best or last}")


async def speak(text: str, voice: Optional[str] = None) -> dict:
    payload = {"text": text, **({"voice": voice} if voice else {})}
    r, _ = await frasberg("POST", "/voice/speak", payload, feature="tts")
    d = r.json()
    if not d.get("audio_base64"):
        raise HTTPException(status_code=424, detail="Frasberg returned no audio")
    return {"audio_base64": strip_data_url(d["audio_base64"]), "mime": d.get("mime", "audio/mp3")}


@api.post("/sts")
async def speech_to_speech(file: UploadFile = File(...), voice: str = Form("nova"),
                           user: Optional[dict] = Depends(optional_user)):
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if voice == "clone" and not (user and user.get("voice_clone")):
        raise HTTPException(status_code=400, detail="Log in and save a voice sample on the Voice Cloning page first")
    try:
        d = await frasberg_upload("/voice/transcribe", file.filename or "voice.webm", audio,
                                  file.content_type or "audio/webm", "stt")
        text = (d.get("text") or "").strip()
    except HTTPException as e:
        logger.warning("Frasberg transcribe failed (%s); using Luchii in-house transcription", e.detail)
        try:
            text = await asyncio.to_thread(local_engines.transcribe, audio)
        except Exception as le:  # noqa: BLE001
            logger.exception("Local transcribe failed")
            raise HTTPException(status_code=400,
                                detail=f"Could not transcribe audio: {le.__class__.__name__}")
    if not text:
        raise HTTPException(status_code=400, detail="No speech detected in the recording")
    speech = await speak_in_clone(text, user["voice_clone"]) if voice == "clone" else await speak_with_fallback(text, voice)
    return {"text": text, "voice": voice, **speech}


# ---------- voice cloning ----------
clone_lock = asyncio.Lock()


class CloneSpeakIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


async def read_sample(clone: dict) -> bytes:
    stream = await fs.open_download_stream(clone["file_id"])
    return await stream.read()


@api.post("/voice/clone")
async def voice_clone(file: UploadFile = File(...), user: dict = Depends(current_user)):
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio file")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 8 MB)")
    name, ctype = file.filename or "sample.webm", file.content_type or "audio/webm"
    try:
        async with clone_lock:
            d = await frasberg_upload("/voice/clone", name, data, ctype, "clone")
    except HTTPException as e:
        logger.warning("Frasberg clone upload failed (%s); keeping sample for in-house cloning", e.detail)
        try:
            d = {"duration_sec": await asyncio.to_thread(local_engines.audio_duration, data), "cloning_status": "ready"}
        except Exception:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="Could not read that audio file")
    file_id = await fs.upload_from_stream(f"voice-samples/{user['id']}/{uuid.uuid4()}", data,
                                          metadata={"user_id": user["id"], "content_type": ctype})
    clone = {"file_id": file_id, "filename": name, "content_type": ctype,
             "duration_sec": d.get("duration_sec"), "created_at": now_iso()}
    await db.users.update_one({"id": user["id"]}, {"$set": {"voice_clone": clone}})
    return {"has_sample": True, "duration_sec": clone["duration_sec"], "cloning_status": d.get("cloning_status"),
            "created_at": clone["created_at"]}


@api.get("/voice/clone")
async def voice_clone_info(user: dict = Depends(current_user)):
    c = user.get("voice_clone")
    if not c:
        return {"has_sample": False}
    return {"has_sample": True, "duration_sec": c.get("duration_sec"), "created_at": c.get("created_at")}


@api.get("/voice/clone/sample")
async def voice_clone_sample(user: dict = Depends(current_user)):
    c = user.get("voice_clone")
    if not c:
        raise HTTPException(status_code=404, detail="No voice sample yet")
    return Response(content=await read_sample(c), media_type=c["content_type"])


@api.post("/voice/clone/speak")
async def voice_clone_speak(body: CloneSpeakIn, user: dict = Depends(current_user)):
    c = user.get("voice_clone")
    if not c:
        raise HTTPException(status_code=400, detail="Record your voice sample first")
    return {"text": body.text, **(await speak_in_clone(body.text, c))}


async def speak_in_clone(text: str, clone: dict) -> dict:
    sample = await read_sample(clone)
    try:
        async with clone_lock:
            await frasberg_upload("/voice/clone", clone["filename"], sample, clone["content_type"], "clone")
            return {**(await speak(text)), "engine": "frasberg"}
    except HTTPException as e:
        logger.warning("Frasberg cloned speech failed (%s); using in-house voice converter", e.detail)
    try:
        return {**(await asyncio.to_thread(local_engines.speak_cloned, text, sample)), "engine": "luchii-local"}
    except Exception as e:  # noqa: BLE001
        logger.exception("Local voice conversion failed")
        raise HTTPException(status_code=424, detail=f"Voice clone engine error: {e.__class__.__name__}")


# ---------- video & music jobs (Frasberg Edge) ----------
VIDEO_STYLES = {
    "cinematic": "cinematic film still, anamorphic lens, dramatic lighting, rich color grade",
    "photoreal": "photorealistic, natural light, ultra detailed, 35mm photography",
    "anime": "anime key visual, vibrant cel shading, clean line art",
    "3d": "3D animated film still, pixar style, soft global illumination",
    "noir": "black and white film noir, high contrast, moody shadows",
    "fantasy": "epic fantasy concept art, magical glow, painterly detail",
}
MUSIC_STYLES = {
    "lofi": "lo-fi hip hop, mellow, vinyl crackle", "cinematic": "epic cinematic orchestral score",
    "electronic": "electronic dance music, synths, punchy beat", "ambient": "ambient, atmospheric pads, calm",
    "rock": "rock, electric guitars, live drums", "jazz": "smooth jazz, saxophone, upright bass",
    "hiphop": "hip hop beat, boom bap drums, deep bass", "acoustic": "acoustic folk, guitar, warm",
}
MEDIA_LIMITS = {"video": (5, 15), "music": (5, 30)}
media_queues = {"video": asyncio.Lock(), "music": asyncio.Lock()}


class JobIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=500)
    duration: int = 10
    style: Optional[str] = None


async def job_out(job: dict) -> dict:
    out = {"job_id": job["id"], "kind": job["kind"], "status": job["status"], "prompt": job.get("prompt"),
           "style": job.get("style"), "duration": job.get("duration"), "error": job.get("error"),
           "url": f"/api/media/{job['id']}" if job["status"] == "completed" else None}
    if job["status"] == "queued":
        out["queue_position"] = await db.jobs.count_documents(
            {"kind": job["kind"], "engine": "local", "status": {"$in": ["queued", "running"]},
             "created_at": {"$lt": job["created_at"]}}) + 1
    return out


async def run_media(job: dict):
    kind = job["kind"]
    async with media_queues[kind]:
        await db.jobs.update_one({"id": job["id"]}, {"$set": {"status": "running", "started_at": now_iso()}})
        try:
            if kind == "video":
                data = await asyncio.to_thread(local_engines.generate_video, job["prompt"], job["duration"],
                                               VIDEO_STYLES.get(job.get("style") or "", ""))
                mime = "video/mp4"
            else:
                style = MUSIC_STYLES.get(job.get("style") or "", "")
                data = await asyncio.to_thread(local_engines.generate_music,
                                               f"{job['prompt']}. {style}" if style else job["prompt"], job["duration"])
                mime = "audio/wav"
            file_id = await media_fs.upload_from_stream(f"{kind}/{job['id']}", data, metadata={"mime": mime})
            update = {"status": "completed", "file_id": file_id, "mime": mime}
        except Exception as e:  # noqa: BLE001
            logger.exception("%s generation failed", kind)
            update = {"status": "failed", "error": f"{kind.title()} engine error: {e.__class__.__name__}"}
        await db.jobs.update_one({"id": job["id"]}, {"$set": {**update, "finished_at": now_iso()}})


async def create_media_job(kind: str, body: JobIn, user: Optional[dict]):
    lo, hi = MEDIA_LIMITS[kind]
    job = {"id": str(uuid.uuid4()), "kind": kind, "engine": "local", "status": "queued", "prompt": body.prompt.strip(),
           "style": body.style, "duration": max(lo, min(hi, body.duration)), "error": None,
           "user_id": user["id"] if user else None, "created_at": now_iso()}
    await db.jobs.insert_one(job.copy())
    asyncio.create_task(run_media(job))
    return await job_out(job)


@api.post("/video")
async def video(body: JobIn, user: Optional[dict] = Depends(optional_user)):
    return await create_media_job("video", body, user)


@api.post("/music")
async def music(body: JobIn, user: Optional[dict] = Depends(optional_user)):
    return await create_media_job("music", body, user)


@api.get("/media/{job_id}")
async def media_file(job_id: str):
    job = await db.jobs.find_one({"id": job_id, "status": "completed", "engine": "local"}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Not ready")
    stream = await media_fs.open_download_stream(job["file_id"])
    return Response(content=await stream.read(), media_type=job["mime"], headers={"Accept-Ranges": "none"})


@api.get("/jobs/{job_id}")
async def job_status(job_id: str):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("engine") == "local":
        return await job_out(job)
    r, _ = await frasberg("GET", f"/jobs/{job_id}", key_index=job["key_index"])
    d = r.json()
    status = d.get("status", "queued")
    await db.jobs.update_one({"id": job_id}, {"$set": {"status": status}})
    url = None
    if status == "completed":
        url = f"/api/music/{job_id}/audio" if job["kind"] == "music" else (
            d.get("video_url") or (d.get("result") or {}).get("url"))
    return {"job_id": job_id, "kind": job["kind"], "status": status, "url": url, "error": d.get("error")}


@api.get("/music/{job_id}/audio")
async def music_audio(job_id: str):
    job = await db.jobs.find_one({"id": job_id, "kind": "music"}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    r, _ = await frasberg("GET", f"/generate/music/task/{job_id}/audio", key_index=job["key_index"])
    return Response(content=r.content, media_type=r.headers.get("content-type", "audio/wav"))


# ---------- saved voice takes ----------
class TakeIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    voice: str
    mime: str = "audio/wav"
    audio_base64: str = Field(min_length=1)


def take_out(t: dict) -> dict:
    return {"id": t["id"], "text": t["text"], "voice": t["voice"], "mime": t["mime"],
            "audio_url": f"/api/voice/takes/{t['id']}/audio", "created_at": t["created_at"]}


@api.post("/voice/takes")
async def save_take(body: TakeIn, user: dict = Depends(current_user)):
    data = base64.b64decode(strip_data_url(body.audio_base64))
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Take too large")
    take = {"id": str(uuid.uuid4()), "user_id": user["id"], "text": body.text, "voice": body.voice,
            "mime": body.mime, "created_at": now_iso()}
    take["file_id"] = await takes_fs.upload_from_stream(f"takes/{user['id']}/{take['id']}", data,
                                                        metadata={"user_id": user["id"]})
    await db.voice_takes.insert_one(take.copy())
    return take_out(take)


@api.get("/voice/takes")
async def list_takes(limit: int = 50, user: dict = Depends(current_user)):
    cur = db.voice_takes.find({"user_id": user["id"]}, {"_id": 0})
    return [take_out(t) for t in await cur.sort("created_at", -1).limit(min(limit, 200)).to_list(None)]


@api.get("/voice/takes/{take_id}/audio")
async def take_audio(take_id: str):
    t = await db.voice_takes.find_one({"id": take_id}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Take not found")
    stream = await takes_fs.open_download_stream(t["file_id"])
    return Response(content=await stream.read(), media_type=t["mime"])


@api.delete("/voice/takes/{take_id}")
async def delete_take(take_id: str, user: dict = Depends(current_user)):
    t = await db.voice_takes.find_one({"id": take_id, "user_id": user["id"]}, {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Take not found")
    await takes_fs.delete(t["file_id"])
    await db.voice_takes.delete_one({"id": take_id})
    return {"deleted": True}


# ---------- 3D studio ----------
shape_queue = asyncio.Lock()


class ModelIn(BaseModel):
    prompt: Optional[str] = Field(default=None, max_length=300)
    image_base64: Optional[str] = None
    session_id: Optional[str] = None


async def model_out(m: dict) -> dict:
    out = {k: m.get(k) for k in ("id", "prompt", "status", "error", "created_at", "finished_at", "source", "thumbnail")}
    out["model_url"] = f"/api/3d/{m['id']}/model.glb" if m["status"] == "completed" else None
    if m["status"] == "queued":
        out["queue_position"] = await db.models3d.count_documents(
            {"status": {"$in": ["queued", "running"]}, "created_at": {"$lt": m["created_at"]}}) + 1
    return out


async def run_3d(model_id: str, prompt: str, image_b64: Optional[str] = None):
    async with shape_queue:
        await db.models3d.update_one({"id": model_id}, {"$set": {"status": "running", "started_at": now_iso()}})
        try:
            glb = await asyncio.to_thread(local_engines.generate_3d, prompt, image_b64)
            file_id = await models_fs.upload_from_stream(f"models3d/{model_id}.glb", glb)
            update = {"status": "completed", "file_id": file_id}
        except Exception as e:  # noqa: BLE001
            logger.exception("3D generation failed")
            update = {"status": "failed", "error": f"3D engine error: {e.__class__.__name__}"}
        await db.models3d.update_one({"id": model_id}, {"$set": {**update, "finished_at": now_iso()}})


@api.post("/3d")
async def create_3d(body: ModelIn, user: Optional[dict] = Depends(optional_user)):
    prompt = (body.prompt or "").strip()
    if not prompt and not body.image_base64:
        raise HTTPException(status_code=400, detail="Describe an object or upload a photo")
    thumb = None
    if body.image_base64:
        try:
            thumb = await asyncio.to_thread(local_engines.thumbnail, body.image_base64)
        except Exception:  # noqa: BLE001
            raise HTTPException(status_code=400, detail="That file isn't a readable image")
    m = {"id": str(uuid.uuid4()), "prompt": prompt or "Photo to 3D", "status": "queued", "error": None,
         "source": "image" if body.image_base64 else "text", "thumbnail": thumb,
         "session_id": body.session_id, "user_id": user["id"] if user else None, "created_at": now_iso()}
    await db.models3d.insert_one(m.copy())
    asyncio.create_task(run_3d(m["id"], m["prompt"], body.image_base64))
    return await model_out(m)


@api.get("/3d")
async def list_3d(session_id: Optional[str] = None, limit: int = 12, user: Optional[dict] = Depends(optional_user)):
    if not user and not session_id:
        return []
    q = {"user_id": user["id"]} if user else {"session_id": session_id}
    cur = db.models3d.find(q, {"_id": 0})
    return [await model_out(m) for m in await cur.sort("created_at", -1).limit(min(limit, 60)).to_list(None)]


@api.get("/3d/{model_id}")
async def get_3d(model_id: str):
    m = await db.models3d.find_one({"id": model_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Model not found")
    return await model_out(m)


@api.get("/3d/{model_id}/model.glb")
async def get_3d_file(model_id: str):
    m = await db.models3d.find_one({"id": model_id, "status": "completed"}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Model not ready")
    stream = await models_fs.open_download_stream(m["file_id"])
    return Response(content=await stream.read(), media_type="model/gltf-binary",
                    headers={"Cache-Control": "public, max-age=86400"})


# ---------- spaces builder ----------
class SpaceItem(BaseModel):
    uid: str = Field(min_length=1, max_length=64)
    model_id: str
    position: list[float] = Field(min_length=3, max_length=3)
    rotation: list[float] = Field(min_length=3, max_length=3)
    scale: float = Field(gt=0, le=50)


class SpaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    ground: str = Field(default="#1b2a30", pattern=r"^#[0-9a-fA-F]{6}$")
    items: list[SpaceItem] = Field(default_factory=list, max_length=60)


def space_out(sp: dict) -> dict:
    return {k: sp.get(k) for k in ("id", "name", "ground", "items", "author", "created_at", "updated_at")}


async def check_models(items: list[SpaceItem]):
    ids = {i.model_id for i in items}
    found = await db.models3d.count_documents({"id": {"$in": list(ids)}, "status": "completed"})
    if found != len(ids):
        raise HTTPException(status_code=400, detail="Some objects are missing or not finished")


@api.post("/spaces")
async def create_space(body: SpaceIn, user: dict = Depends(current_user)):
    await check_models(body.items)
    sp = {"id": str(uuid.uuid4()), "user_id": user["id"], "author": user.get("name"), **body.model_dump(),
          "created_at": now_iso(), "updated_at": now_iso()}
    await db.spaces.insert_one(sp.copy())
    return space_out(sp)


@api.get("/spaces")
async def list_spaces(user: dict = Depends(current_user)):
    cur = db.spaces.find({"user_id": user["id"]}, {"_id": 0})
    return [space_out(sp) for sp in await cur.sort("updated_at", -1).limit(100).to_list(None)]


@api.get("/spaces/{space_id}")
async def get_space(space_id: str):
    sp = await db.spaces.find_one({"id": space_id}, {"_id": 0})
    if not sp:
        raise HTTPException(status_code=404, detail="Space not found")
    return space_out(sp)


@api.put("/spaces/{space_id}")
async def update_space(space_id: str, body: SpaceIn, user: dict = Depends(current_user)):
    await check_models(body.items)
    res = await db.spaces.update_one({"id": space_id, "user_id": user["id"]},
                                     {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Space not found")
    return space_out(await db.spaces.find_one({"id": space_id}, {"_id": 0}))


@api.delete("/spaces/{space_id}")
async def delete_space(space_id: str, user: dict = Depends(current_user)):
    res = await db.spaces.delete_one({"id": space_id, "user_id": user["id"]})
    if not res.deleted_count:
        raise HTTPException(status_code=404, detail="Space not found")
    return {"deleted": True}


# ---------- engine status ----------
SAMPLE_HOSTS = ("mozilla.net", "mozilla.org", "filesamples", "sample", "example", "w3schools", "commondatastorage.googleapis.com",
                "test-videos", "pexels.com", "pixabay.com", "archive.org", "bigbuckbunny")
_status_cache: dict = {}


async def _timed(coro):
    t = time.monotonic()
    try:
        status, detail = await coro
    except HTTPException as e:
        status, detail = "offline", str(e.detail)
    except Exception as e:  # noqa: BLE001
        status, detail = "offline", f"{e.__class__.__name__}"
    return status, detail, int((time.monotonic() - t) * 1000)


async def probe_image():
    await frasberg_image({"prompt": "status check: a small red circle"})
    return "online", "Generating images"


async def probe_voice():
    await frasberg("POST", "/voice/speak", {"text": "Status check", "voice": "nova"}, feature="tts")
    return "online", "Speaking"


async def probe_job(path: str, payload: dict, kind: str):
    r, ki = await frasberg("POST", path, payload, feature=kind)
    task = r.json().get("task_id")
    for _ in range(12):
        await asyncio.sleep(3)
        jr, _ = await frasberg("GET", f"/jobs/{task}", key_index=ki)
        d = jr.json()
        if d.get("status") == "completed":
            url = d.get("video_url") or (d.get("result") or {}).get("url") or ""
            if kind == "video" and (not url or any(h in url.lower() for h in SAMPLE_HOSTS)):
                return "degraded", f"Returns public sample file instead of a render ({url.split('/')[2] if '//' in url else 'no url'})"
            return "online", "Jobs completing"
        if d.get("status") == "failed":
            return "offline", d.get("error") or "Job failed"
    return "degraded", "Job did not finish within 36s"


async def probe_chat():
    text = ""
    async with httpx.AsyncClient(timeout=60) as hc:
        r = await hc.post(f"{FRASBERG_BASE}/v1/chat", json={"message": "Reply with OK", "model": "luchii-6-plus"},
                          headers={"Authorization": f"Bearer {FRASBERG_KEYS[0]}"})
    if r.status_code >= 400:
        return "offline", upstream_detail(r)
    for m in re.finditer(r'"delta":\s*"([^"]*)"', r.text):
        text += m.group(1)
    if not text or "turbulence" in text.lower():
        return "degraded", "Replies with turbulence error"
    return "online", "Replying"


async def probe_local_voice():
    await asyncio.to_thread(local_engines.synthesize, "Status check", "nova")
    return "online", "Piper voices running on Frasberg edge"


async def probe_local_image():
    st = local_engines.status()
    if st["image_loaded"]:
        return "online", "SD-Turbo loaded on Frasberg edge (CPU)"
    if st["image_downloaded"]:
        return "online", "SD-Turbo ready, loads on first image"
    return "degraded", "SD-Turbo downloads on first image (~2.5 GB)"


async def probe_local_3d():
    st = local_engines.status()
    if local_engines.busy_3d():
        return "online", "Building a 3D model now"
    if st["shape_loaded"]:
        return "online", "Shap-E loaded on Frasberg edge (CPU)"
    if st["shape_downloaded"]:
        return "online", "Shap-E ready, loads on first model"
    return "degraded", "Shap-E downloads on first model (~4 GB)"


async def probe_local_clone():
    st = local_engines.status()
    return ("online", "OpenVoice converter loaded") if st["converter_loaded"] else ("degraded", "OpenVoice loads on first use")


ENGINES = [
    ("image", "Image Engine", "Generate, edit, upscale", probe_image),
    ("voice", "Voice Engine", "Text to Speech", probe_voice),
    ("video", "Astral Video Engine", "Video Creator",
     lambda: probe_job("/generate/video", {"prompt": "status check", "duration": 5, "model": "frasberg-engine",
                                           "ratio": "16:9", "output_format": "mp4"}, "video")),
    ("music", "Music Engine", "Audio Studio",
     lambda: probe_job("/generate/music", {"prompt": "status check", "duration": 15, "model": "frasberg-music"}, "music")),
    ("chat", "Luchii Chat (luchii-6-plus)", "Language model", probe_chat),
    ("local_voice", "Frasberg Edge Voice", "Text to Speech & Speech to Speech fallback", probe_local_voice),
    ("local_image", "Frasberg Edge Image", "Generate, edit, upscale fallback", probe_local_image),
    ("local_3d", "Frasberg Edge 3D", "3D Studio", probe_local_3d),
    ("local_clone", "Frasberg Edge Voice Clone", "Cloned voice in Voice Cloning & Speech to Speech", probe_local_clone),
]


ADMIN_EMAILS = {e.strip().lower() for e in os.environ["ADMIN_EMAILS"].split(",") if e.strip()}


async def admin_user(user: dict = Depends(current_user)) -> dict:
    if user["email"].lower() not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admins only")
    return user


@api.get("/engines/status")
async def engines_status(refresh: bool = False, _: dict = Depends(admin_user)):
    cached = _status_cache.get("data")
    if cached and not refresh and time.monotonic() - _status_cache["t"] < 120:
        return cached
    results = await asyncio.gather(*[_timed(fn()) for _, _, _, fn in ENGINES])
    engines = [{"id": i, "name": n, "powers": p, "status": s, "detail": d, "latency_ms": ms}
               for (i, n, p, _), (s, d, ms) in zip(ENGINES, results)]
    data = {"checked_at": now_iso(), "engines": engines}
    _status_cache.update(data=data, t=time.monotonic())
    return data


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id")
    await db.generations.create_index("id")
    await db.generations.create_index([("session_id", 1), ("created_at", -1)])
    await db.generations.create_index([("user_id", 1), ("created_at", -1)])
    await db.jobs.create_index("id")
    await db.login_attempts.create_index("identifier")
    await db.voice_takes.create_index([("user_id", 1), ("created_at", -1)])
    await db.models3d.create_index("id")
    await db.spaces.create_index("id")
    await db.spaces.create_index([("user_id", 1), ("updated_at", -1)])
    await db.jobs.update_many({"engine": "local", "status": {"$in": ["queued", "running"]}},
                              {"$set": {"status": "failed", "error": "Interrupted by a server restart. Please try again."}})
    await db.models3d.update_many({"status": {"$in": ["queued", "running"]}},
                                  {"$set": {"status": "failed", "error": "Interrupted by a server restart. Please try again."}})
    asyncio.get_running_loop().run_in_executor(None, local_engines.warm_up)


@app.on_event("shutdown")
async def shutdown():
    client.close()
