#!/usr/bin/env python3
"""Test structured data with Gemini embeddings"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 80)
print("🧪 Testing Structured Data with Gemini Embeddings")
print("=" * 80)

# Test embedding generation
from embedding_service import get_embedding_service

service = get_embedding_service()

print("\n1️⃣ Service Status:")
print(f"   Gemini: {'✅' if service._gemini_client else '❌'}")
print(f"   Vertex AI: {'✅' if service._vertex_ai_model else '❌'}")

# Test structured data embedding
print("\n2️⃣ Generating structured data embedding...")
test_file = "test_structured_upload.json"

result = service.generate_embedding(test_file, 'structured')

if result:
    print(f"   ✅ Embedding generated!")
    print(f"   Model: {result.get('model')}")
    print(f"   Dimensions: {result.get('dimension')}")
    print(f"   Original: {result.get('original_dimension')} → Normalized: {result.get('dimension')}")
else:
    print(f"   ❌ Failed to generate embedding")

# Test document embedding
print("\n3️⃣ Testing document embedding (simulated)...")
# Create a test text file
with open("test_doc.txt", "w") as f:
    f.write("This is a test document about cloud storage and semantic search.")

result = service.generate_embedding("test_doc.txt", 'document')

if result:
    print(f"   ✅ Document embedding generated!")
    print(f"   Model: {result.get('model')}")
    print(f"   Dimensions: {result.get('dimension')}")
else:
    print(f"   ❌ Failed to generate embedding")

# Cleanup
os.unlink("test_doc.txt")

print("\n" + "=" * 80)
print("✅ Test complete!")
print("\nSummary:")
print("- Structured data: Using Gemini (768 dim) → normalized to 512")
print("- Documents: Using Gemini (768 dim) → normalized to 512")
print("- Media (images/video/audio): Using Vertex AI / CLIP")
print("=" * 80)

