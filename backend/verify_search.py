#!/usr/bin/env python3
"""
Quick verification: search for "red dress"
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from embedding_service import get_embedding_service, normalize_embedding_dimension, TARGET_EMBEDDING_DIM
from storage_pinecone import PineconeStorage
from storage_db import get_db_storage

def main():
    user_id = "b0539bc2-e877-41ce-8231-c867a0b17503"
    query = "red dress"
    
    print("=" * 80)
    print(f"🔍 Testing search: '{query}'")
    print("=" * 80)
    
    # 1. Generate query embedding
    print("\n1️⃣  Generating query embedding...")
    embedding_service = get_embedding_service()
    query_embedding = embedding_service.generate_text_embedding(query)
    query_embedding = normalize_embedding_dimension(query_embedding, TARGET_EMBEDDING_DIM)
    print(f"   ✅ Query embedding: {len(query_embedding)} dimensions")
    
    # 2. Search Pinecone
    print("\n2️⃣  Searching Pinecone...")
    pinecone_storage = PineconeStorage()
    
    search_results = pinecone_storage.query(
        query_vector=query_embedding.tolist(),
        top_k=20,
        include_metadata=True
    )
    
    matches = search_results.get('matches', [])
    print(f"   ✅ Found {len(matches)} total matches")
    
    # 3. Filter by user
    print("\n3️⃣  Filtering by user...")
    db_storage = get_db_storage()
    
    if db_storage.collection is None:
        print("   ❌ MongoDB not connected")
        return
    
    # Extract file IDs
    file_ids = []
    score_map = {}
    for match in matches:
        file_id = match.get('id', '')
        if '_chunk_' in file_id:
            file_id = file_id.split('_chunk_')[0]
        
        score = match.get('score', 0)
        if file_id not in score_map or score > score_map[file_id]:
            score_map[file_id] = score
            if file_id not in file_ids:
                file_ids.append(file_id)
    
    # Fetch from MongoDB
    mongo_query = {
        'file_id': {'$in': file_ids},
        'user_id': user_id,
    }
    
    user_files = list(db_storage.collection.find(mongo_query))
    print(f"   ✅ Found {len(user_files)} files for user")
    
    # 4. Show results
    print("\n4️⃣  Search results:")
    print("   " + "-" * 76)
    print(f"   {'Score':<10} {'Type':<10} {'File Name'}")
    print("   " + "-" * 76)
    
    for file_doc in user_files:
        file_id = file_doc.get('file_id')
        file_name = file_doc.get('metadata', {}).get('file_name', 'unknown')
        file_type = file_doc.get('metadata', {}).get('type', 'unknown')
        score = score_map.get(file_id, 0)
        
        print(f"   {score:<10.4f} {file_type:<10} {file_name}")
    
    print("\n" + "=" * 80)
    print(f"✅ Search returned {len(user_files)} results for '{query}'")
    print("=" * 80)


if __name__ == "__main__":
    main()

