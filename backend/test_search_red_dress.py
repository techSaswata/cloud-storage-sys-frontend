#!/usr/bin/env python3
"""Test semantic search for 'red dress'"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from embedding_service import get_embedding_service
from storage_pinecone import PineconeStorage

def main():
    print("=" * 80)
    print("🔍 Testing semantic search for 'red dress'")
    print("=" * 80)
    
    # Initialize services
    embedding_service = get_embedding_service()
    pinecone_storage = PineconeStorage()
    
    # Generate query embedding
    print("\n📝 Generating query embedding for: 'red dress'")
    query_result = embedding_service.generate_text_embedding("red dress", use_clip=True)
    
    if query_result is None:
        print("   ❌ Failed to generate query embedding")
        return
    
    print(f"   ✅ Query embedding: {len(query_result)} dimensions")
    
    # Search Pinecone
    print("\n🔎 Searching Pinecone...")
    search_response = pinecone_storage.query(
        query_vector=query_result.tolist(),
        top_k=5,
        filter=None
    )
    
    # Extract matches from response
    matches = search_response.get('matches', []) if isinstance(search_response, dict) else getattr(search_response, 'matches', [])
    
    if not matches:
        print("   ⚠️  No results found")
        return
    
    print(f"\n📊 Found {len(matches)} results:\n")
    
    for idx, result in enumerate(matches, 1):
        score = result.get('score', 0)
        file_id = result.get('id', 'unknown')
        metadata = result.get('metadata', {})
        
        file_name = metadata.get('original_name', 'unknown')
        file_type = metadata.get('type', 'unknown')
        model = metadata.get('model', 'unknown')
        
        print(f"{idx}. Score: {score:.4f}")
        print(f"   File: {file_name}")
        print(f"   Type: {file_type}")
        print(f"   Model: {model}")
        print(f"   ID: {file_id}")
        print()
    
    print("=" * 80)

if __name__ == "__main__":
    main()

