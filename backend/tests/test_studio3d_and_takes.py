"""Tests for Luchii new features: 3D Studio, Voice Takes, Voice Clone Speak (iteration 7)."""
import base64
import io
import math
import os
import struct
import uuid
import wave

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL",
                          "https://bulk-import-36.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

TEST_EMAIL = "test@luchii.ai"
TEST_PASS = "Test1234!"
WAV_SRC = "/app/tests/src.wav"
WAV_REF = "/app/tests/ref.wav"


@pytest.fixture(scope="module")
def token():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASS})
    if r.status_code != 200:
        pytest.skip(f"login failed: {r.status_code} {r.text}")
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _gen_wav(seconds=7.0, sr=16000, freq=440):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
        n = int(seconds * sr)
        frames = b"".join(struct.pack("<h", int(10000 * math.sin(2 * math.pi * freq * i / sr))) for i in range(n))
        w.writeframes(frames)
    return buf.getvalue()


# ---------- Branding ----------
class TestBranding:
    def test_root_api(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200
        # Backend root currently says "Luchii AI API is running" — flagged, UI should not.
        assert "Luchii" in r.json().get("message", "")


# ---------- 3D Studio ----------
class TestStudio3D:
    def test_list_requires_session_or_user(self):
        r = requests.get(f"{API}/3d")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_by_session(self):
        r = requests.get(f"{API}/3d", params={"session_id": "t1"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # seeded 'a wooden treasure chest'
        if data:
            m = data[0]
            assert m["status"] in ("queued", "running", "completed", "failed")
            if m["status"] == "completed":
                assert m["model_url"].startswith("/api/3d/")

    def test_get_notfound(self):
        r = requests.get(f"{API}/3d/{uuid.uuid4()}")
        assert r.status_code == 404

    def test_glb_fetch_existing(self):
        r = requests.get(f"{API}/3d", params={"session_id": "t1"})
        done = [m for m in r.json() if m["status"] == "completed"]
        if not done:
            pytest.skip("no completed 3D model to fetch")
        g = requests.get(f"{BASE_URL}{done[0]['model_url']}")
        assert g.status_code == 200
        assert g.headers.get("content-type") == "model/gltf-binary"
        assert len(g.content) > 100
        assert g.content[:4] == b"glTF"

    def test_create_returns_queued(self):
        r = requests.post(f"{API}/3d",
                          json={"prompt": "a tiny glass bead", "session_id": "test-3d-iter7"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] in ("queued", "running")
        assert d.get("id")
        assert d.get("model_url") is None
        # queue_position present when queued
        if d["status"] == "queued":
            assert isinstance(d.get("queue_position"), int) and d["queue_position"] >= 1
        # Verify persisted
        g = requests.get(f"{API}/3d/{d['id']}")
        assert g.status_code == 200
        assert g.json()["id"] == d["id"]

    def test_second_job_queued(self):
        # Submit a job first (if lock is free, this one goes running); then submit a second,
        # which should land queued at position 2.
        r1 = requests.post(f"{API}/3d",
                           json={"prompt": "a small marble", "session_id": "test-3d-queue"})
        assert r1.status_code == 200
        r2 = requests.post(f"{API}/3d",
                           json={"prompt": "a tiny pebble", "session_id": "test-3d-queue"})
        assert r2.status_code == 200
        d2 = r2.json()
        # d2 should be queued; queue_position should be at least 2 given r1 holds the lock.
        if d2["status"] == "queued":
            assert d2.get("queue_position", 0) >= 2, d2

    def test_glb_not_ready_for_running(self):
        # A fresh model that is queued/running should 404 on the GLB endpoint until completed.
        r = requests.post(f"{API}/3d", json={"prompt": "a tiny die", "session_id": "test-3d-notready"})
        mid = r.json()["id"]
        g = requests.get(f"{API}/3d/{mid}/model.glb")
        assert g.status_code == 404


# ---------- Voice Takes ----------
class TestVoiceTakes:
    def test_list_unauth(self):
        r = requests.get(f"{API}/voice/takes")
        assert r.status_code == 401

    def test_save_unauth(self):
        r = requests.post(f"{API}/voice/takes",
                          json={"text": "hi", "voice": "nova", "mime": "audio/wav",
                                "audio_base64": base64.b64encode(_gen_wav(1.0)).decode()})
        assert r.status_code == 401

    def test_full_crud(self, auth):
        wav = _gen_wav(1.5)
        payload = {"text": "TEST take hello world", "voice": "nova", "mime": "audio/wav",
                   "audio_base64": base64.b64encode(wav).decode()}
        c = requests.post(f"{API}/voice/takes", json=payload, headers=auth)
        assert c.status_code == 200, c.text
        tk = c.json()
        assert tk["id"] and tk["text"] == payload["text"] and tk["voice"] == "nova"
        assert tk["audio_url"] == f"/api/voice/takes/{tk['id']}/audio"
        assert "_id" not in tk

        # GET list contains it
        lr = requests.get(f"{API}/voice/takes", headers=auth)
        assert lr.status_code == 200
        assert any(t["id"] == tk["id"] for t in lr.json())

        # Audio stream
        ar = requests.get(f"{BASE_URL}{tk['audio_url']}")
        assert ar.status_code == 200
        assert len(ar.content) >= len(wav) // 2

        # Delete and verify gone
        dr = requests.delete(f"{API}/voice/takes/{tk['id']}", headers=auth)
        assert dr.status_code == 200 and dr.json().get("deleted") is True
        lr2 = requests.get(f"{API}/voice/takes", headers=auth)
        assert not any(t["id"] == tk["id"] for t in lr2.json())
        # Audio should 404
        ar2 = requests.get(f"{BASE_URL}{tk['audio_url']}")
        assert ar2.status_code == 404

    def test_save_too_large(self, auth):
        big = base64.b64encode(b"\x00" * (16 * 1024 * 1024)).decode()
        r = requests.post(f"{API}/voice/takes",
                          json={"text": "x", "voice": "nova", "mime": "audio/wav", "audio_base64": big},
                          headers=auth)
        assert r.status_code == 400


# ---------- Voice Clone Speak ----------
class TestCloneSpeak:
    def test_speak_unauth(self):
        r = requests.post(f"{API}/voice/clone/speak", json={"text": "hi"})
        assert r.status_code == 401

    def test_speak_no_sample_or_ok(self, auth):
        # If the user has a sample, this returns 200 (frasberg or luchii-local); else 400.
        info = requests.get(f"{API}/voice/clone", headers=auth)
        has = info.status_code == 200 and info.json().get("has_sample")
        r = requests.post(f"{API}/voice/clone/speak",
                          json={"text": "hello from luchii cloned voice test"},
                          headers=auth, timeout=120)
        if not has:
            assert r.status_code == 400
            return
        assert r.status_code in (200, 424), r.text
        if r.status_code == 200:
            d = r.json()
            assert d.get("audio_base64") and len(d["audio_base64"]) > 100
            assert d.get("engine") in ("frasberg", "luchii-local")
            assert d.get("text")

    def test_sts_clone_unauth_rejected(self):
        # voice=clone without auth should 400
        wav = _gen_wav(1.5)
        r = requests.post(f"{API}/sts",
                          files={"file": ("v.wav", wav, "audio/wav")},
                          data={"voice": "clone"})
        assert r.status_code in (400, 401), r.text

    def test_sts_with_clone_auth(self, auth):
        # Only if a sample exists
        info = requests.get(f"{API}/voice/clone", headers=auth)
        if not (info.status_code == 200 and info.json().get("has_sample")):
            pytest.skip("no voice sample on test user")
        with open(WAV_SRC, "rb") as f:
            src = f.read()
        r = requests.post(f"{API}/sts",
                          files={"file": ("src.wav", src, "audio/wav")},
                          data={"voice": "clone"},
                          headers=auth, timeout=240)
        assert r.status_code in (200, 424), r.text
        if r.status_code == 200:
            d = r.json()
            assert d.get("text")
            assert d.get("audio_base64") and len(d["audio_base64"]) > 100
            assert d.get("engine") in ("frasberg", "luchii-local")
