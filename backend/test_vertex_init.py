#!/usr/bin/env python3
"""Test Vertex AI initialization"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 80)
print("🧪 Testing Vertex AI Initialization")
print("=" * 80)

# Test 1: Check environment variables
print("\n1️⃣ Checking environment variables...")
from config import Config

print(f"   GCP_PROJECT_ID: {Config.GCP_PROJECT_ID}")
print(f"   GCP_LOCATION: {Config.GCP_LOCATION}")
print(f"   GOOGLE_APPLICATION_CREDENTIALS: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}")

if not Config.GCP_PROJECT_ID:
    print("   ❌ GCP_PROJECT_ID not set")
    sys.exit(1)

print("   ✅ Environment variables set")

# Test 2: Initialize embedding service
print("\n2️⃣ Initializing Embedding Service...")
from embedding_service import get_embedding_service

service = get_embedding_service()

if service._vertex_ai_model:
    print("   ✅ Vertex AI initialized successfully!")
    print(f"   Model: {service._vertex_ai_model}")
else:
    print("   ❌ Vertex AI failed to initialize")
    print("   Check if:")
    print("   - Vertex AI API is enabled in your GCP project")
    print("   - Service account has 'Vertex AI User' role")
    print("   - Credentials file is valid")

# Test 3: Try to load a test image
print("\n3️⃣ Testing image embedding generation...")
import tempfile
from PIL import Image
import numpy as np

# Create a simple test image
test_img = Image.new('RGB', (100, 100), color='red')
with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as f:
    test_img.save(f.name)
    test_path = f.name

try:
    if service._vertex_ai_model:
        print("   Generating Vertex AI embedding...")
        result = service.generate_embedding(test_path, 'image')
        
        if result and result.get('embedding') is not None:
            embedding = result['embedding']
            print(f"   ✅ Embedding generated: {len(embedding)} dimensions")
            print(f"   Model: {result.get('model')}")
        else:
            print("   ❌ Embedding generation returned None")
    else:
        print("   ⚠️  Skipping (Vertex AI not initialized)")
finally:
    os.unlink(test_path)

print("\n" + "=" * 80)
print("✅ Test complete!")
print("=" * 80)

