#!/usr/bin/env python3
"""
Test file upload with proper authentication
"""
import requests
import os
from pathlib import Path
import json

API_BASE = "http://localhost:8000"

print("=" * 70)
print("TESTING AUTHENTICATED FILE UPLOAD")
print("=" * 70)
print()

# Step 1: Request magic link for a test user
test_email = "test@example.com"
print(f"1. Requesting magic link for: {test_email}")

response = requests.post(
    f"{API_BASE}/auth/magic-link",
    json={
        "email": test_email,
        "redirect_to": "http://localhost:3000/auth/callback"
    }
)

print(f"   Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"   ✅ Magic link sent!")
    
    # Extract the token from the magic_link_url
    if 'magic_link_url' in data:
        magic_link = data['magic_link_url']
        print(f"   Magic link: {magic_link}")
        
        # Extract token from URL
        if '#access_token=' in magic_link:
            token_part = magic_link.split('#access_token=')[1]
            access_token = token_part.split('&')[0]
            print(f"   ✅ Extracted token: {access_token[:50]}...")
        else:
            print("   ❌ No access_token in magic link")
            exit(1)
    else:
        print("   ❌ No magic_link_url in response")
        print(f"   Response: {data}")
        exit(1)
else:
    print(f"   ❌ Failed: {response.text}")
    exit(1)

print()

# Step 2: Verify token works
print("2. Verifying authentication...")
headers = {"Authorization": f"Bearer {access_token}"}

response = requests.get(f"{API_BASE}/auth/me", headers=headers)
print(f"   Status: {response.status_code}")

if response.status_code == 200:
    user_data = response.json()
    print(f"   ✅ Authenticated as: {user_data.get('user', {}).get('email', 'Unknown')}")
else:
    print(f"   ❌ Auth failed: {response.text}")
    exit(1)

print()

# Step 3: Upload file
test_file = Path(__file__).parent / "test.jpg"

if not test_file.exists():
    print(f"❌ Test file not found: {test_file}")
    exit(1)

print(f"3. Uploading file: {test_file.name}")
print(f"   Size: {test_file.stat().st_size / (1024*1024):.2f} MB")

files = {
    'files': ('test.jpg', open(test_file, 'rb'), 'image/jpeg')
}

data = {
    'batch_name': 'Auth Test Upload',
    'compress': 'true',
    'generate_embeddings': 'true'
}

print("   Uploading... (this may take a minute)")

try:
    response = requests.post(
        f"{API_BASE}/upload/batch",
        files=files,
        data=data,
        headers=headers,
        timeout=120  # 2 minutes for processing
    )
    
    print(f"   Status: {response.status_code}")
    print()
    
    if response.status_code == 201:
        print("   ✅ UPLOAD SUCCESSFUL!")
        result = response.json()
        print(f"   Batch ID: {result.get('batch_id', 'Unknown')}")
        print(f"   Files processed: {result.get('processed', 0)}")
        print(f"   Successful: {result.get('successful', 0)}")
        print(f"   Failed: {result.get('failed', 0)}")
        print()
        
        if result.get('results'):
            for r in result['results']:
                if r.get('success'):
                    print(f"   ✅ {r.get('filename', 'Unknown')} - {r.get('pipeline', 'Unknown')} pipeline")
                else:
                    print(f"   ❌ {r.get('filename', 'Unknown')} - Error: {r.get('error', 'Unknown')}")
    
    elif response.status_code == 500:
        print("   ❌ 500 INTERNAL SERVER ERROR")
        print()
        print("   Response:")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2))
        except:
            print(response.text[:1000])
        print()
        print("   Check /tmp/backend_logs.txt for full error traceback!")
    
    else:
        print(f"   ❌ Unexpected status: {response.status_code}")
        print(f"   Response: {response.text[:500]}")

except requests.exceptions.Timeout:
    print("   ❌ Request timed out")
    print("   The backend might still be processing - check /tmp/backend_logs.txt")
    
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

print()
print("=" * 70)
print("Check /tmp/backend_logs.txt for detailed backend logs")
print("=" * 70)

