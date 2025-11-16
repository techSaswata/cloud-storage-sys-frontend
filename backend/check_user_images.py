#!/usr/bin/env python3
"""
Check which images belong to the user and if they have embeddings
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from storage_db import get_db_storage
from storage_pinecone import PineconeStorage

def main():
    user_id = "b0539bc2-e877-41ce-8231-c867a0b17503"  # From terminal logs
    
    print("=" * 80)
    print(f"🔍 Checking images for user: {user_id}")
    print("=" * 80)
    
    # Get MongoDB storage
    db_storage = get_db_storage()
    
    if db_storage.collection is None:
        print("   ❌ MongoDB not connected")
        return
    
    # Find all images for this user
    user_images = list(db_storage.collection.find(
        {
            'user_id': user_id,
            'metadata.type': 'image'
        }
    ))
    
    print(f"\n📊 User has {len(user_images)} images in MongoDB")
    
    if not user_images:
        print("\n⚠️  User has NO images uploaded!")
        print("   💡 Please upload some images first, then the search will work.")
        return
    
    # Check each image for Pinecone embedding
    print("\n📋 Image details:")
    print("-" * 80)
    
    pinecone_storage = PineconeStorage()
    
    for idx, img in enumerate(user_images, 1):
        file_id = img.get('file_id')
        file_name = img.get('metadata', {}).get('file_name', 'unknown')
        s3_key = img.get('s3_key') or img.get('s3_info', {}).get('s3_key', 'unknown')
        
        # Check if in Pinecone
        try:
            pinecone_result = pinecone_storage.index.fetch(ids=[file_id])
            has_embedding = len(pinecone_result.get('vectors', {})) > 0
        except:
            has_embedding = False
        
        status = "✅ Has embedding" if has_embedding else "❌ Missing embedding"
        
        print(f"\n{idx}. {file_name}")
        print(f"   File ID: {file_id}")
        print(f"   S3 Key: {s3_key}")
        print(f"   Embedding: {status}")
    
    # Count
    images_with_embeddings = []
    images_without_embeddings = []
    
    for img in user_images:
        file_id = img.get('file_id')
        try:
            pinecone_result = pinecone_storage.index.fetch(ids=[file_id])
            if len(pinecone_result.get('vectors', {})) > 0:
                images_with_embeddings.append(img)
            else:
                images_without_embeddings.append(img)
        except:
            images_without_embeddings.append(img)
    
    print("\n" + "=" * 80)
    print(f"✅ Images with embeddings: {len(images_with_embeddings)} / {len(user_images)}")
    print(f"❌ Images without embeddings: {len(images_without_embeddings)} / {len(user_images)}")
    
    if images_without_embeddings:
        print("\n⚠️  Some images are missing embeddings!")
        print("   💡 These images were uploaded but embeddings weren't generated.")
        print("   💡 This happens if:")
        print("      - The upload didn't complete properly")
        print("      - Embedding generation failed")
        print("      - generate_embeddings parameter was False")
        
        print("\n   Files without embeddings:")
        for img in images_without_embeddings:
            file_id = img.get('file_id')
            file_name = img.get('metadata', {}).get('file_name', 'unknown')
            print(f"      - {file_id}: {file_name}")
    
    print("=" * 80)


if __name__ == "__main__":
    main()

