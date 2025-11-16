#!/usr/bin/env python3
"""Debug Gemini API"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from google import genai
from config import Config

client = genai.Client(api_key=Config.GEMINI_API_KEY)

# Test text
print("Testing text embedding...")
result = client.models.embed_content(
    model="models/embedding-001",
    contents={"text": "hello world"}
)

print(f"Result type: {type(result)}")
print(f"Result dir: {[x for x in dir(result) if not x.startswith('_')]}")
print(f"Has embedding: {hasattr(result, 'embedding')}")

if hasattr(result, 'embeddings'):
    print(f"Embeddings type: {type(result.embeddings)}")
    print(f"Embeddings length: {len(result.embeddings) if result.embeddings else 0}")
    if result.embeddings:
        print(f"First embedding type: {type(result.embeddings[0])}")
        print(f"First embedding dir: {[x for x in dir(result.embeddings[0]) if not x.startswith('_')]}")
        if hasattr(result.embeddings[0], 'values'):
            print(f"Values length: {len(result.embeddings[0].values)}")
            print(f"First 5 values: {result.embeddings[0].values[:5]}")

