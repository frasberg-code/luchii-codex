"""Tests for the image queue 429 behavior added in iteration 6."""
import os
import threading
import time
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fullstack-preview-65.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


def _fire_generate(prompt: str, results: list):
    try:
        r = requests.post(f"{API}/generate",
                          json={"prompt": prompt, "style": "cinematic",
                                "aspect_ratio": "1:1", "session_id": "test-queue"},
                          timeout=180)
        results.append((r.status_code, r.headers.get("Retry-After"),
                        r.json() if r.headers.get("content-type", "").startswith("application/json") else None))
    except Exception as e:
        results.append(("ERR", None, str(e)))


def test_concurrent_generate_returns_429_with_retry_after():
    """When two /generate calls overlap on local CPU engine, the 2nd should return 429 + Retry-After: 8."""
    results = []
    t1 = threading.Thread(target=_fire_generate, args=("a tiny red apple on a table", results))
    t2 = threading.Thread(target=_fire_generate, args=("a tiny blue cube on a table", results))
    t1.start()
    time.sleep(0.4)  # give first a head start to acquire the image lock
    t2.start()
    t1.join(timeout=200)
    t2.join(timeout=200)

    codes = [r[0] for r in results]
    assert len(results) == 2, f"both threads should return; got {results}"
    assert 429 in codes, f"expected one 429, got codes={codes}, results={results}"
    assert 200 in codes, f"expected one 200, got codes={codes}, results={results}"
    # Validate Retry-After header on the 429
    for status, retry_after, body in results:
        if status == 429:
            assert retry_after == "8", f"Retry-After header mismatch: {retry_after}"
            assert body and "queue" in (body.get("detail") or "").lower(), f"detail={body}"
            assert body["detail"] == "Luchii is finishing another image. Yours is in the queue."
