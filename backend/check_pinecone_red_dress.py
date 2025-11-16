#!/usr/bin/env python3
"""
Diagnostic script to check what's in Pinecone for "red dress" search
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from embedding_service import get_embedding_service, normalize_embedding_dimension, TARGET_EMBEDDING_DIM
from storage_pinecone import PineconeStorage
from storage_db import get_db_storage

def main():
    print("=" * 80)
    print("🔍 PINECONE DIAGNOSTIC: Checking 'red dress' search")
    print("=" * 80)
    
    # 1. Generate query embedding for "red dress"
    print("\n1️⃣  Generating query embedding for 'red dress'...")
    embedding_service = get_embedding_service()
    query_embedding = embedding_service.generate_text_embedding("red dress")
    
    if query_embedding is None:
        print("   ❌ Failed to generate query embedding")
        return
    
    # Normalize to 512 dimensions
    query_embedding = normalize_embedding_dimension(query_embedding, TARGET_EMBEDDING_DIM)
    print(f"   ✅ Query embedding: {len(query_embedding)} dimensions")
    
    # 2. Search Pinecone
    print("\n2️⃣  Searching Pinecone...")
    pinecone_storage = PineconeStorage()
    
    search_results = pinecone_storage.query(
        query_vector=query_embedding.tolist(),
        top_k=100,
        include_metadata=True
    )
    
    if not search_results or 'matches' not in search_results:
        print("   ❌ No results from Pinecone")
        return
    
    matches = search_results['matches']
    print(f"   ✅ Found {len(matches)} matches in Pinecone")
    
    # 3. Analyze top results
    print("\n3️⃣  Top 20 matches:")
    print("   " + "-" * 76)
    print(f"   {'Rank':<6} {'Score':<8} {'Type':<12} {'File Name':<48}")
    print("   " + "-" * 76)
    
    for idx, match in enumerate(matches[:20], 1):
        score = match.get('score', 0)
        metadata = match.get('metadata', {})
        file_type = metadata.get('type', 'unknown')
        file_name = metadata.get('original_name', 'unknown')
        
        # Truncate file name if too long
        if len(file_name) > 45:
            file_name = file_name[:42] + "..."
        
        print(f"   {idx:<6} {score:<8.4f} {file_type:<12} {file_name}")
    
    # 4. Check MongoDB for image files
    print("\n4️⃣  Checking MongoDB for image files...")
    db_storage = get_db_storage()
    
    if db_storage.collection is None:
        print("   ❌ MongoDB not connected")
        return
    
    # Count total images in MongoDB
    total_images = db_storage.collection.count_documents({
        'metadata.type': 'image'
    })
    print(f"   ℹ️  Total images in MongoDB: {total_images}")
    
    # Get all image file names
    image_files = list(db_storage.collection.find(
        {'metadata.type': 'image'},
        {'file_id': 1, 'metadata.file_name': 1, 'metadata.original_name': 1}
    ).limit(50))
    
    print(f"   ℹ️  Image files in MongoDB (first 50):")
    for img in image_files:
        file_id = img.get('file_id')
        file_name = img.get('metadata', {}).get('file_name') or img.get('metadata', {}).get('original_name', 'unknown')
        print(f"      - {file_id}: {file_name}")
    
    # 5. Check if those images are in Pinecone
    print("\n5️⃣  Checking which images are in Pinecone...")
    
    image_file_ids = [img.get('file_id') for img in image_files]
    pinecone_file_ids = [match.get('id', '').split('_chunk_')[0] for match in matches]
    
    images_in_pinecone = set(image_file_ids) & set(pinecone_file_ids)
    images_not_in_pinecone = set(image_file_ids) - set(pinecone_file_ids)
    
    print(f"   ✅ Images in Pinecone: {len(images_in_pinecone)} / {len(image_file_ids)}")
    
    if images_not_in_pinecone:
        print(f"   ⚠️  Images NOT in Pinecone ({len(images_not_in_pinecone)}):")
        for file_id in list(images_not_in_pinecone)[:10]:
            # Get file name
            img = next((i for i in image_files if i.get('file_id') == file_id), None)
            if img:
                file_name = img.get('metadata', {}).get('file_name', 'unknown')
                print(f"      - {file_id}: {file_name}")
    
    # 6. Check for "red dress" specific search
    print("\n6️⃣  Checking if any files match 'red dress' semantically...")
    
    # Filter to image type only
    image_matches = [m for m in matches if m.get('metadata', {}).get('type') == 'image']
    
    if not image_matches:
        print("   ⚠️  No image matches found in Pinecone!")
        print("   💡 This means images might not have embeddings generated yet.")
    else:
        print(f"   ✅ Found {len(image_matches)} image matches")
        print("\n   Top 10 image matches:")
        print("   " + "-" * 76)
        print(f"   {'Rank':<6} {'Score':<8} {'File Name':<62}")
        print("   " + "-" * 76)
        
        for idx, match in enumerate(image_matches[:10], 1):
            score = match.get('score', 0)
            file_name = match.get('metadata', {}).get('original_name', 'unknown')
            
            # Truncate file name if too long
            if len(file_name) > 59:
                file_name = file_name[:56] + "..."
            
            print(f"   {idx:<6} {score:<8.4f} {file_name}")
    
    print("\n" + "=" * 80)
    print("✅ Diagnostic complete!")
    print("=" * 80)


if __name__ == "__main__":
    main()

