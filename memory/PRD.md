# Luchii AI Clone — PRD

## Original problem
Import and clone an exact copy of luchii-ai.com (tools, files, database, features, models, stack) and wire it with the user's own Frasberg keys. No Emergent universal key. Production uses the live MongoDB `luchii-tools`.

## Architecture
- Frontend: the original React source, recovered from the live site's public source map (`main.65f24d02.js.map`). Same pages, styles, starfield, mock content.
- Backend: FastAPI rewritten to match the live API contract. Every AI call goes through Frasberg (`FRASBERG_BASE_URL=https://frasberg.com/api`). It rotates through 8 `frb_live_*` keys, retrying on permission and server errors.
- DB: MongoDB collections `users`, `generations`, `jobs`, `login_attempts`. Preview uses local Mongo because Atlas blocks this pod's IP. Production uses MONGO_URL/DB_NAME from the deployment secrets.

## Implemented (2026-06)
- Pages: Home, /create (text-to-image, image-to-image, upscale, share, download), /gallery, /s/:id, /models, /tts, /developers, /legal/:doc. New: /video (Video Creator) and /audio (Audio Studio).
- JWT auth (register/login/me), lockout after 5 bad attempts per email.
- Frasberg wiring: /generate/image (generate/edit/upscale), /voice/speak (TTS), /generate/video and /generate/music, polled via /jobs/{id}, with a music WAV proxy.

## Upstream status (Frasberg, at build time)
- Image: HTTP 502 upstream. TTS: 503 "voice engine warming up". Only key #5 has music permission, and none of the keys have text_to_speech permission.
- Video jobs complete, but they return sample MDN clips.

## Backlog
- P0: Get Frasberg image and voice endpoints healthy. Grant text_to_speech permission to the keys.
- P1: Speech to Speech, 3D Studio, Spaces Builder (still "Soon").
- P2: Frasberg chat (luchii-6-plus) assistant inside the app.

## Update (2026-10)
- In-house Luchii engines are used when a Frasberg-keyed call fails: Piper voices (TTS/STS), faster-whisper base (STT), SD-Turbo on CPU (generate/edit/upscale). Models are stored in LUCHII_MODELS_DIR and preloaded at startup.
- Voice Cloning page (/voice-clone): samples are stored in a GridFS voice_samples bucket. Speaking in the cloned voice is Frasberg-only.
- Per-feature key routing via FRASBERG_KEY_ROUTES.
- The /status page and /api/engines/status are admin-only (ADMIN_EMAILS) and the Status link is no longer in the public nav.
- The homepage showcase only shows generations with featured=true and otherwise falls back to the curated graphics.
