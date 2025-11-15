#!/usr/bin/env python3
"""
Direct test of batch upload to see actual errors
"""
import requests
import os
from pathlib import Path

API_BASE = "http://localhost:8000"

# First, get auth token (using a test user)
print("=" * 60)
print("TESTING BATCH UPLOAD DIRECTLY")
print("=" * 60)
print()

# Check if backend is running
try:
    health = requests.get(f"{API_BASE}/health", timeout=5)
    print(f"✅ Backend is running: {health.json()}")
except Exception as e:
    print(f"❌ Backend is not running: {e}")
    print("\nPlease start the backend with: python3 api.py")
    exit(1)

print()

# For this test, we'll skip auth and test the actual upload processing
# Let's test with test.jpg file

test_file = Path(__file__).parent / "test.jpg"

if not test_file.exists():
    print(f"❌ Test file not found: {test_file}")
    exit(1)

print(f"📁 Test file: {test_file}")
print(f"📊 Size: {test_file.stat().st_size / 1024:.2f} KB")
print()

# Try batch upload (this requires auth, so this will fail with 401)
# But we'll see if the endpoint is working
print("Testing batch upload endpoint...")
print()

files = {
    'files': ('test.jpg', open(test_file, 'rb'), 'image/jpeg')
}

data = {
    'batch_name': 'Direct Test Upload',
    'compress': 'true',
    'generate_embeddings': 'true'
}

try:
    response = requests.post(
        f"{API_BASE}/upload/batch",
        files=files,
        data=data,
        timeout=60
    )
    
    print(f"Status Code: {response.status_code}")
    print()
    
    if response.status_code == 401:
        print("⚠️  Expected 401 - Auth required")
        print("This is normal - the endpoint requires authentication")
        print()
        print("The real uploads from frontend should work with auth token")
    elif response.status_code == 500:
        print("❌ 500 Internal Server Error - Something is broken!")
        print()
        print("Response:")
        print(response.text[:500])
    else:
        print("Response:")
        try:
            print(response.json())
        except:
            print(response.text[:500])
            
except Exception as e:
    print(f"❌ Error during upload: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 60)
print("Now check the backend terminal for detailed error logs")
print("=" * 60)

