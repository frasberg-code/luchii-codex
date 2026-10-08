"""Backend API tests for luchii-ai clone."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else "https://fullstack-preview-65.preview.emergentagent.com"
API = f"{BASE_URL}/api"

TEST_EMAIL = "test@luchii.ai"
TEST_PASS = "Test1234!"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(session):
    # Try login; if fails, register.
    r = session.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASS})
    if r.status_code == 200:
        return r.json()["token"]
    # Clear login_attempts lockouts not possible via API; try register.
    r = session.post(f"{API}/auth/register", json={"name": "Test", "email": TEST_EMAIL, "password": TEST_PASS})
    if r.status_code == 200:
        return r.json()["token"]
    # try login again
    r = session.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASS})
    if r.status_code == 200:
        return r.json()["token"]
    pytest.skip(f"Cannot auth: {r.status_code} {r.text}")


# ---------- health ----------
def test_root(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    assert "Luchii" in r.json()["message"]


# ---------- auth ----------
class TestAuth:
    def test_register_duplicate(self, session, token):
        r = session.post(f"{API}/auth/register",
                         json={"name": "x", "email": TEST_EMAIL, "password": TEST_PASS})
        assert r.status_code == 400

    def test_login_success(self, session, token):
        r = session.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASS})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and d["user"]["email"] == TEST_EMAIL
        assert "_id" not in d["user"]

    def test_me(self, session, token):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["email"] == TEST_EMAIL

    def test_me_unauth(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- generate (expect upstream 424) ----------
class TestGenerate:
    def test_generate_graceful_error(self, session):
        r = session.post(f"{API}/generate",
                         json={"prompt": "a cat", "style": "cinematic", "aspect_ratio": "1:1",
                               "session_id": "test-sess"})
        # Expected: 200 if upstream works, 424 if frasberg down
        assert r.status_code in (200, 424)
        if r.status_code == 424:
            assert "Frasberg" in r.json().get("detail", "")
        else:
            d = r.json()
            assert "image_base64" in d and d["prompt"] == "a cat"


# ---------- tts ----------
class TestTTS:
    def test_tts_graceful(self, session):
        r = session.post(f"{API}/tts", json={"text": "hello world", "voice": "nova"})
        assert r.status_code in (200, 424)
        if r.status_code == 424:
            assert "Frasberg" in r.json().get("detail", "")


# ---------- read-only lists ----------
class TestLists:
    def test_showcase(self, session):
        r = session.get(f"{API}/showcase")
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, list)
        for item in d:
            assert "_id" not in item

    def test_generations_by_session(self, session):
        r = session.get(f"{API}/generations", params={"session_id": "nonexistent"})
        assert r.status_code == 200
        assert r.json() == []

    def test_generations_missing_param(self, session):
        r = session.get(f"{API}/generations")
        assert r.status_code == 422

    def test_my_generations_auth(self, session, token):
        r = session.get(f"{API}/my/generations", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_my_generations_unauth(self, session):
        r = session.get(f"{API}/my/generations")
        assert r.status_code == 401

    def test_share_notfound(self, session):
        r = session.get(f"{API}/share/does-not-exist-id")
        assert r.status_code == 404


# ---------- video & music jobs ----------
class TestJobs:
    def test_video_job_flow(self, session):
        r = session.post(f"{API}/video", json={"prompt": "a short clip of ocean waves", "duration": 5})
        assert r.status_code in (200, 424), r.text
        if r.status_code == 424:
            pytest.skip(f"video upstream down: {r.json().get('detail')}")
        job_id = r.json()["job_id"]
        assert job_id
        # poll
        deadline = time.time() + 90
        last = None
        while time.time() < deadline:
            jr = session.get(f"{API}/jobs/{job_id}")
            assert jr.status_code == 200
            last = jr.json()
            if last["status"] in ("completed", "failed", "error"):
                break
            time.sleep(3)
        assert last and last["status"] == "completed", f"video not completed: {last}"
        assert last["url"]

    def test_music_job_flow(self, session):
        r = session.post(f"{API}/music", json={"prompt": "soft piano melody", "duration": 5})
        assert r.status_code in (200, 424), r.text
        if r.status_code == 424:
            pytest.skip(f"music upstream down: {r.json().get('detail')}")
        job_id = r.json()["job_id"]
        deadline = time.time() + 90
        last = None
        while time.time() < deadline:
            jr = session.get(f"{API}/jobs/{job_id}")
            assert jr.status_code == 200
            last = jr.json()
            if last["status"] in ("completed", "failed", "error"):
                break
            time.sleep(3)
        assert last and last["status"] == "completed", f"music not completed: {last}"
        assert last["url"] == f"/api/music/{job_id}/audio"
        # fetch audio bytes
        ar = session.get(f"{BASE_URL}{last['url']}")
        assert ar.status_code == 200
        assert len(ar.content) > 100

    def test_job_notfound(self, session):
        r = session.get(f"{API}/jobs/{uuid.uuid4()}")
        assert r.status_code == 404


# ---------- speech-to-speech ----------
class TestSTS:
    def test_sts_empty_file(self):
        r = requests.post(f"{API}/sts", files={"file": ("v.webm", b"", "audio/webm")}, data={"voice": "nova"})
        assert r.status_code == 400

    def test_sts_graceful_upstream(self):
        # Fake/non-decodable bytes: Frasberg stt returns 424 (no perm), local whisper fails to decode.
        # Server should return a graceful 4xx (not 500).
        r = requests.post(f"{API}/sts",
                         files={"file": ("v.webm", b"\x1a\x45\xdf\xa3fakeaudio", "audio/webm")},
                         data={"voice": "onyx"})
        assert r.status_code in (200, 400, 424), r.text


# ---------- voice cloning ----------
def _gen_wav(seconds: float = 7.0, sr: int = 16000, freq: int = 440) -> bytes:
    import math, struct, io, wave
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        n = int(seconds * sr)
        frames = b"".join(struct.pack("<h", int(10000 * math.sin(2 * math.pi * freq * i / sr))) for i in range(n))
        w.writeframes(frames)
    return buf.getvalue()


class TestVoiceClone:
    def test_clone_info_unauth(self):
        r = requests.get(f"{API}/voice/clone")
        assert r.status_code == 401

    def test_clone_sample_unauth(self):
        r = requests.get(f"{API}/voice/clone/sample")
        assert r.status_code == 401

    def test_clone_upload_unauth(self):
        r = requests.post(f"{API}/voice/clone", files={"file": ("s.wav", _gen_wav(1), "audio/wav")})
        assert r.status_code == 401

    def test_clone_upload_empty(self, token):
        r = requests.post(f"{API}/voice/clone",
                          headers={"Authorization": f"Bearer {token}"},
                          files={"file": ("s.wav", b"", "audio/wav")})
        assert r.status_code == 400

    def test_clone_upload_too_large(self, token):
        big = b"\x00" * (8 * 1024 * 1024 + 10)
        r = requests.post(f"{API}/voice/clone",
                          headers={"Authorization": f"Bearer {token}"},
                          files={"file": ("big.wav", big, "audio/wav")})
        assert r.status_code == 400
        assert "too large" in r.json().get("detail", "").lower()

    def test_clone_upload_too_short(self, token):
        short = _gen_wav(1.0)  # 1 second
        r = requests.post(f"{API}/voice/clone",
                          headers={"Authorization": f"Bearer {token}"},
                          files={"file": ("s.wav", short, "audio/wav")})
        # Upstream Frasberg returns 424 'Sample too short — speak for at least 5 seconds'
        # Or if upstream permission missing, generic 424 Frasberg: ...
        assert r.status_code in (200, 424), r.text
        if r.status_code == 424:
            assert "Frasberg" in r.json().get("detail", "")

    def test_clone_upload_valid_and_persistence(self, token):
        wav = _gen_wav(7.0)
        r = requests.post(f"{API}/voice/clone",
                          headers={"Authorization": f"Bearer {token}"},
                          files={"file": ("sample.wav", wav, "audio/wav")})
        if r.status_code == 424:
            pytest.skip(f"clone upstream unavailable: {r.json().get('detail')}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["has_sample"] is True
        # Verify persistence via GET /voice/clone
        info = requests.get(f"{API}/voice/clone", headers={"Authorization": f"Bearer {token}"})
        assert info.status_code == 200
        assert info.json()["has_sample"] is True
        # Fetch sample blob
        s = requests.get(f"{API}/voice/clone/sample", headers={"Authorization": f"Bearer {token}"})
        assert s.status_code == 200
        assert len(s.content) > 100

    def test_clone_speak_graceful(self, token):
        # Requires an existing sample from the previous test, else backend returns 400
        r = requests.post(f"{API}/voice/clone/speak",
                          headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                          json={"text": "hello in my voice"})
        assert r.status_code in (200, 400, 424), r.text
        if r.status_code == 424:
            assert "Frasberg" in r.json().get("detail", "")



# ---------- engines status (admin only) ----------
class TestEnginesStatus:
    def test_status_shape(self, session, token):
        r = session.get(f"{API}/engines/status", params={"refresh": "true"},
                        headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        d = r.json()
        assert "checked_at" in d and isinstance(d.get("engines"), list)
        ids = {e["id"] for e in d["engines"]}
        assert {"image", "voice", "video", "music", "chat", "local_voice", "local_image"}.issubset(ids)
        for e in d["engines"]:
            assert e["status"] in ("online", "degraded", "offline")
            assert "name" in e and "detail" in e and "latency_ms" in e

    def test_status_unauth(self, session):
        r = session.get(f"{API}/engines/status")
        assert r.status_code in (401, 403)

    def test_local_engines_online(self, session, token):
        r = session.get(f"{API}/engines/status",
                        headers={"Authorization": f"Bearer {token}"})
        d = r.json()
        by_id = {e["id"]: e for e in d["engines"]}
        assert by_id["local_voice"]["status"] == "online", by_id["local_voice"]
        assert by_id["local_image"]["status"] in ("online", "degraded"), by_id["local_image"]


# ---------- Local fallback tests ----------
class TestLocalFallback:
    def test_tts_local_fallback(self, session):
        """TTS: Frasberg voice is offline/warming -> should fall back to luchii-local."""
        r = session.post(f"{API}/tts", json={"text": "hello from luchii", "voice": "nova"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("engine") in ("frasberg", "luchii-local")
        assert d.get("audio_base64") and len(d["audio_base64"]) > 100
        assert "mime" in d

    def test_generate_local_fallback(self, session):
        """/generate: Frasberg image is 502 -> should fall back to luchii-local SD-Turbo."""
        r = session.post(f"{API}/generate",
                         json={"prompt": "a tiny red apple", "style": "cinematic",
                               "aspect_ratio": "1:1", "session_id": "test-fallback"},
                         timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("engine") in ("frasberg", "luchii-local")
        assert d["image_base64"].startswith("data:image/")
        assert len(d["image_base64"]) > 1000

    def test_edit_local_fallback(self, session):
        """/edit: generate an image first, then edit via local engine."""
        # First get a base image (uses local fallback likely)
        g = session.post(f"{API}/generate",
                        json={"prompt": "a small blue square", "aspect_ratio": "1:1",
                              "session_id": "test-edit"}, timeout=180)
        assert g.status_code == 200
        src = g.json()["image_base64"]
        r = session.post(f"{API}/edit",
                         json={"prompt": "make it green", "image_base64": src,
                               "session_id": "test-edit"},
                         timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("engine") in ("frasberg", "luchii-local")
        assert d["image_base64"].startswith("data:image/")

    def test_sts_local_full_loop(self, session):
        """STS: feed real speech produced by local Piper -> /sts should transcribe and respond."""
        # Produce a short WAV from TTS (local Piper)
        t = session.post(f"{API}/tts", json={"text": "This is a test of Luchii speech to speech.",
                                             "voice": "nova"})
        assert t.status_code == 200, t.text
        import base64 as _b64
        audio_bytes = _b64.b64decode(t.json()["audio_base64"])
        assert len(audio_bytes) > 1000
        # Upload to /sts
        r = requests.post(f"{API}/sts",
                          files={"file": ("speech.wav", audio_bytes, "audio/wav")},
                          data={"voice": "onyx"}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("text") and len(d["text"]) > 2
        assert d.get("audio_base64") and len(d["audio_base64"]) > 100
        assert d.get("engine") in ("frasberg", "luchii-local")


# ---------- brute force lockout ----------
class TestLockout:
    def test_lockout_after_5(self, session):
        # unique email to avoid interfering with real test user
        bad_email = f"nouser_{uuid.uuid4().hex[:8]}@example.com"
        # 5 bad attempts
        codes = []
        for _ in range(6):
            r = session.post(f"{API}/auth/login", json={"email": bad_email, "password": "wrong"})
            codes.append(r.status_code)
        # after 5 401s, next should be 429
        assert 429 in codes, f"no lockout; codes={codes}"
