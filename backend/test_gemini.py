#!/usr/bin/env python3
"""Test Gemini embeddings"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from embedding_service import get_embedding_service

def main():
    print("=" * 80)
    print("🧪 Testing Gemini Embeddings")
    print("=" * 80)
    
    embedding_service = get_embedding_service()
    
    # Test text embedding
    print("\n1️⃣  Testing text embedding...")
    text_emb = embedding_service.generate_text_embedding("a beautiful girl with red dress")
    
    if text_emb is not None:
        print(f"   ✅ Text embedding: {len(text_emb)} dimensions")
        print(f"   First 5 values: {text_emb[:5]}")
    else:
        print("   ❌ Text embedding failed")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    main()

