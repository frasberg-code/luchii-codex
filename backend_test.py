#!/usr/bin/env python3
"""
Fast backend test for Luchii AI platform
Tests all backend APIs quickly without waiting for heavy jobs to complete
"""
import requests
import json
import base64
import time
import uuid
from pathlib import Path

# Configuration
BASE_URL = "https://bulk-import-36.preview.emergentagent.com/api"
TEST_EMAIL = "test@luchii.ai"
TEST_PASSWORD = "Test1234!"

# Pre-completed job IDs for media verification
PRE_COMPLETED_VIDEO_JOB = "3b9a5cdf-c2de-453c-bd7f-06ae47129c32"
PRE_COMPLETED_MUSIC_JOB = "e3593fb3-82f9-4167-bb20-ce8cb4208e37"

# Test audio files
SRC_WAV = "/app/tests/src.wav"
REF_WAV = "/app/tests/ref.wav"

# Test results
results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

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

def log_warning(test_name, warning):
    msg = f"⚠️  {test_name}: {warning}"
    print(msg)
    results["warnings"].append(f"{test_name}: {warning}")

def test_auth():
    """Test authentication flows"""
    print("\n=== Testing Authentication ===")
    
    # 1. Register new user
    random_email = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
    random_password = "TestPass123!"
    
    try:
        resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": random_email,
            "password": random_password,
            "name": "Test User"
        })
        if resp.status_code == 200:
            log_pass("Auth: Register new user", f"Created {random_email}")
        else:
            log_fail("Auth: Register new user", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("Auth: Register new user", str(e))
    
    # 2. Login with correct credentials
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("token")
            if token:
                log_pass("Auth: Login correct credentials", f"Got token")
                # Store token for later tests
                global AUTH_TOKEN
                AUTH_TOKEN = token
            else:
                log_fail("Auth: Login correct credentials", "No token in response")
        else:
            log_fail("Auth: Login correct credentials", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("Auth: Login correct credentials", str(e))
    
    # 3. Login with wrong password
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": "WrongPassword123!"
        })
        if resp.status_code == 401:
            log_pass("Auth: Login wrong password returns 401")
        else:
            log_fail("Auth: Login wrong password", f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_fail("Auth: Login wrong password", str(e))
    
    # 4. GET /api/auth/me with token
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email") == TEST_EMAIL:
                log_pass("Auth: GET /me with token", f"User: {data.get('email')}")
            else:
                log_fail("Auth: GET /me with token", f"Wrong user: {data}")
        else:
            log_fail("Auth: GET /me with token", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("Auth: GET /me with token", str(e))
    
    # 5. GET /api/auth/me without token (should fail)
    try:
        resp = requests.get(f"{BASE_URL}/auth/me")
        if resp.status_code == 401:
            log_pass("Auth: GET /me without token returns 401")
        else:
            log_fail("Auth: GET /me without token", f"Expected 401, got {resp.status_code}")
    except Exception as e:
        log_fail("Auth: GET /me without token", str(e))

def test_image_generation():
    """Test image generation with Frasberg->local fallback"""
    print("\n=== Testing Image Generation ===")
    
    session_id = f"qa_{uuid.uuid4().hex[:8]}"
    
    try:
        resp = requests.post(f"{BASE_URL}/generate", json={
            "prompt": "a small red circle",
            "style": "photorealistic",
            "aspect_ratio": "1:1",
            "session_id": session_id
        }, timeout=70)
        
        if resp.status_code == 200:
            data = resp.json()
            if "image_base64" in data and data["image_base64"]:
                engine = data.get("engine", "unknown")
                log_pass("Image: Generate", f"Got image_base64, engine={engine}")
                
                # Verify it's valid base64 (strip data URL prefix if present)
                try:
                    img_data = data["image_base64"]
                    if img_data.startswith("data:"):
                        img_data = img_data.split(",", 1)[1]
                    base64.b64decode(img_data)
                    log_pass("Image: Valid base64 data")
                except:
                    log_fail("Image: Valid base64 data", "Invalid base64")
            else:
                log_fail("Image: Generate", "No image_base64 in response")
        else:
            log_fail("Image: Generate", f"Status {resp.status_code}: {resp.text}")
    except requests.Timeout:
        log_fail("Image: Generate", "Request timed out after 70s")
    except Exception as e:
        log_fail("Image: Generate", str(e))
    
    # Test GET /api/generations?session_id
    try:
        resp = requests.get(f"{BASE_URL}/generations", params={"session_id": session_id})
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                log_pass("Image: GET /generations?session_id", f"Found {len(data)} generations")
            else:
                log_warning("Image: GET /generations?session_id", "Empty list returned")
        else:
            log_fail("Image: GET /generations?session_id", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("Image: GET /generations?session_id", str(e))
    
    # Test GET /api/my/generations with auth
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        resp = requests.get(f"{BASE_URL}/my/generations", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            log_pass("Image: GET /my/generations", f"Got {len(data) if isinstance(data, list) else 'data'}")
        else:
            log_fail("Image: GET /my/generations", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("Image: GET /my/generations", str(e))

def test_media_retrieval():
    """Test retrieval of pre-completed video and music jobs"""
    print("\n=== Testing Media Retrieval (Pre-completed Jobs) ===")
    
    # Test VIDEO job
    try:
        # First check job status
        resp = requests.get(f"{BASE_URL}/jobs/{PRE_COMPLETED_VIDEO_JOB}")
        if resp.status_code == 200:
            job_data = resp.json()
            status = job_data.get("status")
            log_pass("Video: GET /jobs/{id}", f"Status: {status}")
            
            if status != "completed":
                log_warning("Video: Job status", f"Expected 'completed', got '{status}'")
        else:
            log_fail("Video: GET /jobs/{id}", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("Video: GET /jobs/{id}", str(e))
    
    # Test video media retrieval
    try:
        resp = requests.get(f"{BASE_URL}/media/{PRE_COMPLETED_VIDEO_JOB}", timeout=30)
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            content_length = len(resp.content)
            
            if "video/mp4" in content_type:
                log_pass("Video: GET /media/{id}", f"Got video/mp4, {content_length} bytes")
                
                # Check if it's real video data (not a URL redirect)
                if content_length > 1000:  # Real video should be > 1KB
                    # Check for MP4 signature (ftyp box)
                    if b'ftyp' in resp.content[:100]:
                        log_pass("Video: Real local MP4", "Confirmed H.264 MP4 signature")
                    else:
                        log_warning("Video: Real local MP4", "No ftyp signature found")
                else:
                    log_fail("Video: Real local MP4", f"File too small: {content_length} bytes")
            else:
                log_fail("Video: GET /media/{id}", f"Wrong content-type: {content_type}")
        else:
            log_fail("Video: GET /media/{id}", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("Video: GET /media/{id}", str(e))
    
    # Test MUSIC job
    try:
        resp = requests.get(f"{BASE_URL}/jobs/{PRE_COMPLETED_MUSIC_JOB}")
        if resp.status_code == 200:
            job_data = resp.json()
            status = job_data.get("status")
            log_pass("Music: GET /jobs/{id}", f"Status: {status}")
        else:
            log_fail("Music: GET /jobs/{id}", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("Music: GET /jobs/{id}", str(e))
    
    # Test music media retrieval
    try:
        resp = requests.get(f"{BASE_URL}/media/{PRE_COMPLETED_MUSIC_JOB}", timeout=30)
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            content_length = len(resp.content)
            
            if "audio" in content_type or "wav" in content_type:
                log_pass("Music: GET /media/{id}", f"Got {content_type}, {content_length} bytes")
                
                # Check for WAV signature
                if resp.content[:4] == b'RIFF':
                    log_pass("Music: Real WAV file", "Confirmed RIFF/WAV signature")
                else:
                    log_warning("Music: Real WAV file", "No RIFF signature found")
            else:
                log_fail("Music: GET /media/{id}", f"Wrong content-type: {content_type}")
        else:
            log_fail("Music: GET /media/{id}", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("Music: GET /media/{id}", str(e))

def test_job_creation():
    """Test job creation semantics (do NOT wait for completion)"""
    print("\n=== Testing Job Creation (Quick) ===")
    
    # Test VIDEO job creation
    try:
        resp = requests.post(f"{BASE_URL}/video", json={
            "prompt": "test clip for QA",
            "duration": 5,
            "style": "cinematic"
        })
        if resp.status_code == 200:
            data = resp.json()
            job_id = data.get("job_id")
            status = data.get("status")
            queue_pos = data.get("queue_position")
            
            if job_id and status in ["queued", "running"]:
                log_pass("Video: POST /video", f"job_id={job_id}, status={status}, queue_pos={queue_pos}")
            else:
                log_fail("Video: POST /video", f"Missing fields or wrong status: {data}")
        else:
            log_fail("Video: POST /video", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("Video: POST /video", str(e))
    
    # Test second VIDEO job (should have higher queue_position)
    try:
        resp = requests.post(f"{BASE_URL}/video", json={
            "prompt": "second test clip",
            "duration": 5,
            "style": "cinematic"
        })
        if resp.status_code == 200:
            data = resp.json()
            queue_pos = data.get("queue_position", 0)
            if queue_pos >= 2:
                log_pass("Video: Second job queue_position", f"queue_position={queue_pos} >= 2")
            else:
                log_warning("Video: Second job queue_position", f"Expected >= 2, got {queue_pos}")
        else:
            log_fail("Video: Second POST /video", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("Video: Second POST /video", str(e))
    
    # Test MUSIC job creation
    try:
        resp = requests.post(f"{BASE_URL}/music", json={
            "prompt": "upbeat electronic music",
            "duration": 8
        })
        if resp.status_code == 200:
            data = resp.json()
            job_id = data.get("job_id")
            status = data.get("status")
            queue_pos = data.get("queue_position")
            
            if job_id and status in ["queued", "running"]:
                log_pass("Music: POST /music", f"job_id={job_id}, status={status}, queue_pos={queue_pos}")
            else:
                log_fail("Music: POST /music", f"Missing fields: {data}")
        else:
            log_fail("Music: POST /music", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("Music: POST /music", str(e))
    
    # Test 3D job creation
    session_3d = f"qa3d_{uuid.uuid4().hex[:8]}"
    try:
        resp = requests.post(f"{BASE_URL}/3d", json={
            "prompt": "a simple cube",
            "session_id": session_3d
        })
        if resp.status_code == 200:
            data = resp.json()
            job_id = data.get("id") or data.get("job_id")
            status = data.get("status")
            queue_pos = data.get("queue_position")
            
            if job_id and status in ["queued", "running"]:
                log_pass("3D: POST /3d", f"job_id={job_id}, status={status}, queue_pos={queue_pos}")
                
                # Store for next tests
                global CREATED_3D_JOB_ID
                CREATED_3D_JOB_ID = job_id
            else:
                log_fail("3D: POST /3d", f"Missing fields: {data}")
        else:
            log_fail("3D: POST /3d", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("3D: POST /3d", str(e))
    
    # Test GET /api/3d?session_id
    try:
        resp = requests.get(f"{BASE_URL}/3d", params={"session_id": session_3d})
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                log_pass("3D: GET /3d?session_id", f"Found {len(data)} items")
            else:
                log_warning("3D: GET /3d?session_id", "Empty list")
        else:
            log_fail("3D: GET /3d?session_id", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("3D: GET /3d?session_id", str(e))
    
    # Test GET /api/3d/{id}/model.glb (should be 404 - not ready)
    try:
        if CREATED_3D_JOB_ID:
            resp = requests.get(f"{BASE_URL}/3d/{CREATED_3D_JOB_ID}/model.glb")
            if resp.status_code == 404:
                log_pass("3D: GET /3d/{id}/model.glb not ready", "Returns 404 as expected")
            elif resp.status_code == 200:
                log_warning("3D: GET /3d/{id}/model.glb", "Job completed faster than expected")
            else:
                log_fail("3D: GET /3d/{id}/model.glb", f"Unexpected status {resp.status_code}")
    except Exception as e:
        log_fail("3D: GET /3d/{id}/model.glb", str(e))

def test_voice():
    """Test TTS, STS, and voice cloning"""
    print("\n=== Testing Voice APIs ===")
    
    # Test TTS
    try:
        resp = requests.post(f"{BASE_URL}/tts", json={
            "text": "Hello from Luchii",
            "voice": "nova"
        }, timeout=60)
        
        if resp.status_code == 200:
            data = resp.json()
            if "audio_base64" in data and data["audio_base64"]:
                engine = data.get("engine", "unknown")
                log_pass("Voice: POST /tts", f"Got audio_base64, engine={engine}")
            else:
                log_fail("Voice: POST /tts", "No audio_base64 in response")
        else:
            log_fail("Voice: POST /tts", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("Voice: POST /tts", str(e))
    
    # Test STS with file upload (voice=nova, no auth needed)
    try:
        if Path(SRC_WAV).exists():
            with open(SRC_WAV, 'rb') as f:
                files = {'file': ('src.wav', f, 'audio/wav')}
                data = {'voice': 'nova'}
                resp = requests.post(f"{BASE_URL}/sts", files=files, data=data, timeout=50)
                
                if resp.status_code == 200:
                    result = resp.json()
                    if "text" in result and "audio_base64" in result:
                        log_pass("Voice: POST /sts (nova)", f"Got text + audio_base64")
                    else:
                        log_fail("Voice: POST /sts (nova)", f"Missing fields: {result}")
                else:
                    log_fail("Voice: POST /sts (nova)", f"Status {resp.status_code}: {resp.text}")
        else:
            log_fail("Voice: POST /sts (nova)", f"Test file not found: {SRC_WAV}")
    except Exception as e:
        log_fail("Voice: POST /sts (nova)", str(e))
    
    # Test STS with voice=clone WITHOUT auth (should be 400)
    try:
        if Path(SRC_WAV).exists():
            with open(SRC_WAV, 'rb') as f:
                files = {'file': ('src.wav', f, 'audio/wav')}
                data = {'voice': 'clone'}
                resp = requests.post(f"{BASE_URL}/sts", files=files, data=data)
                
                if resp.status_code == 400:
                    log_pass("Voice: POST /sts (clone) without auth", "Returns 400 as expected")
                else:
                    log_fail("Voice: POST /sts (clone) without auth", f"Expected 400, got {resp.status_code}")
    except Exception as e:
        log_fail("Voice: POST /sts (clone) without auth", str(e))
    
    # Test voice clone as authenticated user
    try:
        headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
        
        # First, check if user has a cloned voice sample
        resp = requests.get(f"{BASE_URL}/auth/me", headers=headers)
        if resp.status_code == 200:
            user_data = resp.json()
            has_sample = user_data.get("voice_sample_id") is not None
            
            if not has_sample and Path(REF_WAV).exists():
                # Upload voice sample
                with open(REF_WAV, 'rb') as f:
                    files = {'file': ('ref.wav', f, 'audio/wav')}
                    resp = requests.post(f"{BASE_URL}/voice/clone", files=files, headers=headers, timeout=50)
                    
                    if resp.status_code == 200:
                        log_pass("Voice: POST /voice/clone (upload sample)", "Sample uploaded")
                    else:
                        log_warning("Voice: POST /voice/clone (upload sample)", f"Status {resp.status_code}")
            
            # Test clone speak
            resp = requests.post(f"{BASE_URL}/voice/clone/speak", 
                               json={"text": "hello from cloned voice"},
                               headers=headers,
                               timeout=50)
            
            if resp.status_code == 200:
                result = resp.json()
                if "audio_base64" in result:
                    log_pass("Voice: POST /voice/clone/speak", "Got audio_base64")
                else:
                    log_fail("Voice: POST /voice/clone/speak", "No audio_base64")
            else:
                log_fail("Voice: POST /voice/clone/speak", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("Voice: Clone tests", str(e))

def test_saved_takes():
    """Test saved voice takes CRUD"""
    print("\n=== Testing Saved Voice Takes ===")
    
    headers = {"Authorization": f"Bearer {AUTH_TOKEN}"}
    
    # Create a tiny base64 WAV for testing
    # Minimal WAV header + 1 sample
    tiny_wav = base64.b64encode(
        b'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00'
    ).decode()
    
    created_take_id = None
    
    # POST /api/voice/takes
    try:
        resp = requests.post(f"{BASE_URL}/voice/takes", 
                           json={
                               "audio_base64": tiny_wav,
                               "name": "Test Take",
                               "transcript": "Test transcript"
                           },
                           headers=headers)
        
        if resp.status_code == 200:
            data = resp.json()
            created_take_id = data.get("id")
            if created_take_id:
                log_pass("Takes: POST /voice/takes", f"Created take {created_take_id}")
            else:
                log_fail("Takes: POST /voice/takes", "No id in response")
        else:
            log_fail("Takes: POST /voice/takes", f"Status {resp.status_code}: {resp.text}")
    except Exception as e:
        log_fail("Takes: POST /voice/takes", str(e))
    
    # GET /api/voice/takes
    try:
        resp = requests.get(f"{BASE_URL}/voice/takes", headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_pass("Takes: GET /voice/takes", f"Got {len(data)} takes")
            else:
                log_fail("Takes: GET /voice/takes", "Response not a list")
        else:
            log_fail("Takes: GET /voice/takes", f"Status {resp.status_code}")
    except Exception as e:
        log_fail("Takes: GET /voice/takes", str(e))
    
    # GET /api/voice/takes/{id}/audio
    if created_take_id:
        try:
            resp = requests.get(f"{BASE_URL}/voice/takes/{created_take_id}/audio", headers=headers)
            if resp.status_code == 200:
                log_pass("Takes: GET /voice/takes/{id}/audio", "Audio stream retrieved")
            else:
                log_fail("Takes: GET /voice/takes/{id}/audio", f"Status {resp.status_code}")
        except Exception as e:
            log_fail("Takes: GET /voice/takes/{id}/audio", str(e))
        
        # DELETE /api/voice/takes/{id}
        try:
            resp = requests.delete(f"{BASE_URL}/voice/takes/{created_take_id}", headers=headers)
            if resp.status_code == 200:
                log_pass("Takes: DELETE /voice/takes/{id}", "Take deleted")
                
                # Verify it's gone
                resp = requests.get(f"{BASE_URL}/voice/takes/{created_take_id}/audio", headers=headers)
                if resp.status_code == 404:
                    log_pass("Takes: Verify deletion", "Audio returns 404 after delete")
                else:
                    log_fail("Takes: Verify deletion", f"Expected 404, got {resp.status_code}")
            else:
                log_fail("Takes: DELETE /voice/takes/{id}", f"Status {resp.status_code}")
        except Exception as e:
            log_fail("Takes: DELETE /voice/takes/{id}", str(e))

def print_summary():
    """Print test summary"""
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    print(f"\n✅ PASSED: {len(results['passed'])}")
    for test in results['passed']:
        print(f"  - {test}")
    
    if results['warnings']:
        print(f"\n⚠️  WARNINGS: {len(results['warnings'])}")
        for warning in results['warnings']:
            print(f"  - {warning}")
    
    if results['failed']:
        print(f"\n❌ FAILED: {len(results['failed'])}")
        for failure in results['failed']:
            print(f"  - {failure}")
    
    print("\n" + "="*60)
    
    # Check for critical video media verification
    video_media_tests = [t for t in results['passed'] if 'Video: Real local MP4' in t]
    if video_media_tests:
        print("\n🎯 CRITICAL CHECK: Pre-completed VIDEO job returned REAL local MP4 ✅")
    else:
        print("\n⚠️  CRITICAL CHECK: Could not verify VIDEO is real local MP4")
    
    print("="*60)

if __name__ == "__main__":
    print("Starting Luchii Backend Fast Test")
    print(f"Base URL: {BASE_URL}")
    print(f"Test account: {TEST_EMAIL}")
    
    # Initialize global variables
    AUTH_TOKEN = None
    CREATED_3D_JOB_ID = None
    
    # Run all tests
    test_auth()
    test_image_generation()
    test_media_retrieval()
    test_job_creation()
    test_voice()
    test_saved_takes()
    
    # Print summary
    print_summary()
    
    # Exit with appropriate code
    exit(0 if len(results['failed']) == 0 else 1)
