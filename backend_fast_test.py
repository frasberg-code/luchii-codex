#!/usr/bin/env python3
"""
ULTRA-FAST backend smoke test for Luchii AI platform
CRITICAL: Only calls fast endpoints, NO heavy generation calls
Target: Complete in under 60 seconds
"""
import requests
import json
import base64
import uuid

# Configuration
BASE_URL = "https://bulk-import-36.preview.emergentagent.com/api"
TEST_EMAIL = "test@luchii.ai"
TEST_PASSWORD = "Test1234!"

# Pre-completed job IDs for media verification
PRE_COMPLETED_VIDEO_JOB = "3b9a5cdf-c2de-453c-bd7f-06ae47129c32"
PRE_COMPLETED_MUSIC_JOB = "e3593fb3-82f9-4167-bb20-ce8cb4208e37"

# Test results
results = {
    "passed": [],
    "failed": []
}

AUTH_TOKEN = None

def log_pass(test_name, details=""):
    msg = f"✅ {test_name}"
    if details:
        msg += f": {details}"
    print(msg)
    results["passed"].append(test_name)

def log_fail(test_name, error):
    msg = f"❌ {test_name}: {error}"
    print(msg)
    results["failed"].append(f"{test_name}: {error}")

def test_health():
    """Test GET /api/ health check"""
    print("\n=== 1. Health Check ===")
    try:
        resp = requests.get(f"{BASE_URL}/", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("message") == "Luchii API is running":
                log_pass("GET /api/", "Health check OK")
            else:
                log_fail("GET /api/", f"Unexpected message: {data}")
        else:
            log_fail("GET /api/", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /api/", str(e))

def test_auth():
    """Test authentication flows (FAST - no heavy operations)"""
    print("\n=== 2. Authentication ===")
    global AUTH_TOKEN
    
    # Register new user
    random_email = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": random_email,
            "password": "TestPass123!",
            "name": "QA User"
        }, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if "token" in data and "user" in data:
                log_pass("POST /auth/register", f"Created {random_email}")
            else:
                log_fail("POST /auth/register", "Missing token or user")
        else:
            log_fail("POST /auth/register", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /auth/register", str(e))
    
    # Login with correct credentials
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("token")
            if token:
                AUTH_TOKEN = token
                log_pass("POST /auth/login (correct)", "Got token")
            else:
                log_fail("POST /auth/login (correct)", "No token")
        else:
            log_fail("POST /auth/login (correct)", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("POST /auth/login (correct)", str(e))
    
    # Login with wrong password
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": "WRONGPASS"
        }, timeout=5)
        if resp.status_code == 401:
            log_pass("POST /auth/login (wrong password)", "Returns 401")
        else:
            log_fail("POST /auth/login (wrong password)", f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_fail("POST /auth/login (wrong password)", str(e))
    
    # GET /auth/me with token
    if AUTH_TOKEN:
        try:
            headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
            resp = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("email") == TEST_EMAIL:
                    log_pass("GET /auth/me (with token)", f"User: {TEST_EMAIL}")
                else:
                    log_fail("GET /auth/me (with token)", f"Wrong user: {data}")
            else:
                log_fail("GET /auth/me (with token)", f"Status {resp.status_code}")
        except Exception as e:
            log_fail("GET /auth/me (with token)", str(e))

def test_precompleted_media():
    """Test retrieval of pre-completed video and music jobs (FAST - no generation)"""
    print("\n=== 3. Pre-completed Media Retrieval ===")
    
    # VIDEO job status
    try:
        resp = requests.get(f"{BASE_URL}/jobs/{PRE_COMPLETED_VIDEO_JOB}", timeout=5)
        if resp.status_code == 200:
            job_data = resp.json()
            status = job_data.get("status")
            kind = job_data.get("kind")
            if status == "completed" and kind == "video":
                log_pass("GET /jobs/{video_id}", f"status=completed, kind=video")
            else:
                log_fail("GET /jobs/{video_id}", f"status={status}, kind={kind}")
        else:
            log_fail("GET /jobs/{video_id}", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /jobs/{video_id}", str(e))
    
    # VIDEO media retrieval
    try:
        resp = requests.get(f"{BASE_URL}/media/{PRE_COMPLETED_VIDEO_JOB}", timeout=10)
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            content_length = len(resp.content)
            
            if "video/mp4" in content_type and content_length > 100000:
                # Check for real MP4 signature
                if b'ftyp' in resp.content[:100]:
                    log_pass("GET /media/{video_id}", f"REAL local MP4, {content_length} bytes, has ftyp signature")
                else:
                    log_fail("GET /media/{video_id}", f"MP4 but no ftyp signature - might be external URL")
            else:
                log_fail("GET /media/{video_id}", f"content-type={content_type}, size={content_length}")
        else:
            log_fail("GET /media/{video_id}", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /media/{video_id}", str(e))
    
    # MUSIC job status
    try:
        resp = requests.get(f"{BASE_URL}/jobs/{PRE_COMPLETED_MUSIC_JOB}", timeout=5)
        if resp.status_code == 200:
            job_data = resp.json()
            status = job_data.get("status")
            kind = job_data.get("kind")
            if status == "completed" and kind == "music":
                log_pass("GET /jobs/{music_id}", f"status=completed, kind=music")
            else:
                log_fail("GET /jobs/{music_id}", f"status={status}, kind={kind}")
        else:
            log_fail("GET /jobs/{music_id}", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /jobs/{music_id}", str(e))
    
    # MUSIC media retrieval
    try:
        resp = requests.get(f"{BASE_URL}/media/{PRE_COMPLETED_MUSIC_JOB}", timeout=10)
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            content_length = len(resp.content)
            
            if "audio/wav" in content_type or "audio" in content_type:
                # Check for WAV signature
                if resp.content[:4] == b'RIFF':
                    log_pass("GET /media/{music_id}", f"Real WAV, {content_length} bytes, has RIFF signature")
                else:
                    log_fail("GET /media/{music_id}", f"Audio but no RIFF signature")
            else:
                log_fail("GET /media/{music_id}", f"content-type={content_type}")
        else:
            log_fail("GET /media/{music_id}", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /media/{music_id}", str(e))

def test_job_creation():
    """Test job CREATION only - NO polling to completion (FAST)"""
    print("\n=== 4. Job Creation (Queue Only) ===")
    
    # VIDEO job 1
    try:
        resp = requests.post(f"{BASE_URL}/video", json={
            "prompt": "test",
            "duration": 5,
            "style": "cinematic"
        }, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            job_id = data.get("job_id")
            status = data.get("status")
            queue_pos = data.get("queue_position")
            
            if job_id and status in ["queued", "running"]:
                log_pass("POST /video (1st)", f"job_id={job_id}, status={status}, queue_pos={queue_pos}")
            else:
                log_fail("POST /video (1st)", f"Missing fields: {data}")
        else:
            log_fail("POST /video (1st)", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("POST /video (1st)", str(e))
    
    # VIDEO job 2 (should have queue_position >= 2)
    try:
        resp = requests.post(f"{BASE_URL}/video", json={
            "prompt": "test",
            "duration": 5,
            "style": "cinematic"
        }, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            queue_pos = data.get("queue_position", 0)
            if queue_pos >= 2:
                log_pass("POST /video (2nd)", f"queue_position={queue_pos} >= 2")
            else:
                log_fail("POST /video (2nd)", f"queue_position={queue_pos} < 2")
        else:
            log_fail("POST /video (2nd)", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("POST /video (2nd)", str(e))
    
    # MUSIC job
    try:
        resp = requests.post(f"{BASE_URL}/music", json={
            "prompt": "lofi",
            "duration": 5,
            "style": "lofi"
        }, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            job_id = data.get("job_id")
            status = data.get("status")
            queue_pos = data.get("queue_position")
            
            if job_id and status in ["queued", "running"]:
                log_pass("POST /music", f"job_id={job_id}, status={status}, queue_pos={queue_pos}")
            else:
                log_fail("POST /music", f"Missing fields: {data}")
        else:
            log_fail("POST /music", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("POST /music", str(e))
    
    # 3D job
    session_3d = "qa3d"
    created_3d_id = None
    try:
        resp = requests.post(f"{BASE_URL}/3d", json={
            "prompt": "a cube",
            "session_id": session_3d
        }, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            job_id = data.get("id") or data.get("job_id")
            status = data.get("status")
            queue_pos = data.get("queue_position")
            
            if job_id and status in ["queued", "running"]:
                created_3d_id = job_id
                log_pass("POST /3d", f"job_id={job_id}, status={status}, queue_pos={queue_pos}")
            else:
                log_fail("POST /3d", f"Missing fields: {data}")
        else:
            log_fail("POST /3d", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("POST /3d", str(e))
    
    # GET /3d?session_id
    try:
        resp = requests.get(f"{BASE_URL}/3d", params={"session_id": session_3d}, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                log_pass("GET /3d?session_id", f"Lists {len(data)} items")
            else:
                log_fail("GET /3d?session_id", "Empty list")
        else:
            log_fail("GET /3d?session_id", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /3d?session_id", str(e))
    
    # GET /3d/{id}/model.glb (should be 404 - not ready)
    if created_3d_id:
        try:
            resp = requests.get(f"{BASE_URL}/3d/{created_3d_id}/model.glb", timeout=5)
            if resp.status_code == 404:
                log_pass("GET /3d/{id}/model.glb", "Returns 404 (not ready)")
            else:
                log_fail("GET /3d/{id}/model.glb", f"Expected 404, got {resp.status_code}")
        except Exception as e:
            log_fail("GET /3d/{id}/model.glb", str(e))
    
    # GET /jobs/{nonexistent}
    try:
        fake_id = str(uuid.uuid4())
        resp = requests.get(f"{BASE_URL}/jobs/{fake_id}", timeout=5)
        if resp.status_code == 404:
            log_pass("GET /jobs/{nonexistent}", "Returns 404")
        else:
            log_fail("GET /jobs/{nonexistent}", f"Expected 404, got {resp.status_code}")
    except Exception as e:
        log_fail("GET /jobs/{nonexistent}", str(e))

def test_saved_takes():
    """Test saved voice takes CRUD (FAST - no heavy generation)"""
    print("\n=== 5. Saved Takes CRUD ===")
    
    if not AUTH_TOKEN:
        log_fail("Saved Takes", "No auth token available")
        return
    
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    
    # Tiny base64 WAV
    tiny_wav = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAABEqwAAAQAIAZGF0YQAAAAA="
    
    created_take_id = None
    
    # POST /voice/takes
    try:
        resp = requests.post(f"{BASE_URL}/voice/takes", json={
            "text": "hi",
            "voice": "nova",
            "mime": "audio/wav",
            "audio_base64": tiny_wav
        }, headers=headers, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            created_take_id = data.get("id")
            if created_take_id:
                log_pass("POST /voice/takes", f"Created take {created_take_id}")
            else:
                log_fail("POST /voice/takes", "No id in response")
        else:
            log_fail("POST /voice/takes", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("POST /voice/takes", str(e))
    
    # GET /voice/takes
    try:
        resp = requests.get(f"{BASE_URL}/voice/takes", headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and any(t.get("id") == created_take_id for t in data):
                log_pass("GET /voice/takes", f"Contains created take")
            else:
                log_fail("GET /voice/takes", "Created take not found in list")
        else:
            log_fail("GET /voice/takes", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("GET /voice/takes", str(e))
    
    # GET /voice/takes/{id}/audio
    if created_take_id:
        try:
            resp = requests.get(f"{BASE_URL}/voice/takes/{created_take_id}/audio", headers=headers, timeout=5)
            if resp.status_code == 200:
                log_pass("GET /voice/takes/{id}/audio", "Audio retrieved")
            else:
                log_fail("GET /voice/takes/{id}/audio", f"Status {resp.status_code}")
        except Exception as e:
            log_fail("GET /voice/takes/{id}/audio", str(e))
        
        # DELETE /voice/takes/{id}
        try:
            resp = requests.delete(f"{BASE_URL}/voice/takes/{created_take_id}", headers=headers, timeout=5)
            if resp.status_code == 200:
                log_pass("DELETE /voice/takes/{id}", "Take deleted")
                
                # Verify deletion
                resp = requests.get(f"{BASE_URL}/voice/takes/{created_take_id}/audio", headers=headers, timeout=5)
                if resp.status_code == 404:
                    log_pass("GET /voice/takes/{id}/audio after delete", "Returns 404")
                else:
                    log_fail("GET /voice/takes/{id}/audio after delete", f"Expected 404, got {resp.status_code}")
            else:
                log_fail("DELETE /voice/takes/{id}", f"Status {resp.status_code}")
        except Exception as e:
            log_fail("DELETE /voice/takes/{id}", str(e))

def test_sts_no_auth():
    """Test POST /sts without auth (FAST - should fail before heavy work)"""
    print("\n=== 6. STS Without Auth ===")
    
    try:
        # Try with voice=clone and no auth - should 400
        resp = requests.post(f"{BASE_URL}/sts", data={"voice": "clone"}, timeout=5)
        if resp.status_code == 400:
            log_pass("POST /sts (no auth, voice=clone)", "Returns 400")
        else:
            log_fail("POST /sts (no auth, voice=clone)", f"Expected 400, got {resp.status_code}")
    except Exception as e:
        log_fail("POST /sts (no auth, voice=clone)", str(e))

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("ULTRA-FAST SMOKE TEST SUMMARY")
    print("="*70)
    
    print(f"\n✅ PASSED: {len(results['passed'])}")
    for test in results['passed']:
        print(f"  - {test}")
    
    if results['failed']:
        print(f"\n❌ FAILED: {len(results['failed'])}")
        for failure in results['failed']:
            print(f"  - {failure}")
    
    print("\n" + "="*70)
    
    # Critical check for video media
    video_check = any("REAL local MP4" in t for t in results['passed'])
    if video_check:
        print("🎯 CRITICAL: Pre-completed VIDEO returned REAL local MP4 ✅")
    else:
        print("⚠️  CRITICAL: Could not verify VIDEO is real local MP4")
    
    print("="*70)

if __name__ == "__main__":
    import time
    start_time = time.time()
    
    print("="*70)
    print("LUCHII ULTRA-FAST BACKEND SMOKE TEST")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print(f"Test account: {TEST_EMAIL}")
    print("CRITICAL: Only fast endpoints, NO heavy generation calls")
    print("="*70)
    
    # Run all tests
    test_health()
    test_auth()
    test_precompleted_media()
    test_job_creation()
    test_saved_takes()
    test_sts_no_auth()
    
    # Print summary
    print_summary()
    
    elapsed = time.time() - start_time
    print(f"\n⏱️  Total time: {elapsed:.1f}s")
    
    # Exit with appropriate code
    exit(0 if len(results['failed']) == 0 else 1)
