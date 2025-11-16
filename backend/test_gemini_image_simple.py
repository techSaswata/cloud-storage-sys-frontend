#!/usr/bin/env python3
"""Test Gemini image embedding with exact user example"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from google import genai
from config import Config

client = genai.Client(api_key=Config.GEMINI_API_KEY)

# Create a simple test image
from PIL import Image
import io
import numpy as np

# Create a simple red image
img_array = np.zeros((100, 100, 3), dtype=np.uint8)
img_array[:, :] = [255, 0, 0]  # Red
img = Image.fromarray(img_array)

# Save to bytes
img_bytes_io = io.BytesIO()
img.save(img_bytes_io, format='JPEG')
img_bytes = img_bytes_io.getvalue()

print("Testing image embedding...")
print(f"Image bytes length: {len(img_bytes)}")

# Try the user's example format
result = client.models.embed_content(
    model="models/embedding-001",
    content={
        "mime_type": "image/jpeg",
        "data": img_bytes
    },
)

print(f"Result type: {type(result)}")
print(f"Has embeddings: {hasattr(result, 'embeddings')}")
if hasattr(result, 'embeddings') and result.embeddings:
    print(f"Embedding length: {len(result.embeddings[0].values)}")
    print(f"First 5 values: {result.embeddings[0].values[:5]}")

