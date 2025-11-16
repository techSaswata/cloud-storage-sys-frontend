#!/usr/bin/env python3
"""
Regenerate embeddings for images that don't have them
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from storage_db import get_db_storage
from storage_pinecone import PineconeStorage
from storage_s3 import get_s3_storage
from embedding_service import get_embedding_service
import tempfile

def main():
    user_id = "b0539bc2-e877-41ce-8231-c867a0b17503"
    
    print("=" * 80)
    print(f"🔄 Regenerating embeddings for user images")
    print("=" * 80)
    
    # Get services
    db_storage = get_db_storage()
    pinecone_storage = PineconeStorage()
    s3_storage = get_s3_storage()
    embedding_service = get_embedding_service()
    
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
    
    print(f"\n📊 Found {len(user_images)} images for user")
    
    if not user_images:
        print("\n⚠️  No images found!")
        return
    
    # Process each image
    success_count = 0
    error_count = 0
    
    for idx, img in enumerate(user_images, 1):
        file_id = img.get('file_id')
        file_name = img.get('metadata', {}).get('file_name', 'unknown')
        s3_key = img.get('s3_key') or img.get('s3_info', {}).get('s3_key')
        
        print(f"\n{idx}/{len(user_images)}: {file_name}")
        print(f"   File ID: {file_id}")
        
        # Check if already has embedding
        try:
            pinecone_result = pinecone_storage.index.fetch(ids=[file_id])
            has_embedding = len(pinecone_result.get('vectors', {})) > 0
        except:
            has_embedding = False
        
        if has_embedding:
            print(f"   ✅ Already has embedding - skipping")
            success_count += 1
            continue
        
        # Download from S3
        print(f"   📥 Downloading from S3: {s3_key}")
        try:
            file_data = s3_storage.get_file_bytes(s3_key)
            if not file_data:
                print(f"   ❌ Failed to download from S3")
                error_count += 1
                continue
        except Exception as e:
            print(f"   ❌ S3 download error: {e}")
            error_count += 1
            continue
        
        # Save to temp file
        file_ext = img.get('metadata', {}).get('extension', '.jpg')
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(file_data)
            temp_path = temp_file.name
        
        try:
            # Generate embedding
            print(f"   🔍 Generating embedding...")
            embedding_result = embedding_service.generate_embedding(temp_path, 'image')
            
            if not embedding_result or embedding_result.get('embedding') is None:
                print(f"   ❌ Embedding generation failed")
                error_count += 1
                continue
            
            embedding = embedding_result['embedding']
            
            # Store in Pinecone
            print(f"   💾 Storing in Pinecone...")
            pinecone_metadata = {
                'file_id': file_id,
                'type': 'image',
                'format': img.get('metadata', {}).get('format', ''),
                'original_name': file_name,
                'model': embedding_result.get('model', 'CLIP'),
            }
            
            pinecone_result = pinecone_storage.upsert_embedding(
                file_id=file_id,
                embedding=embedding,
                metadata=pinecone_metadata
            )
            
            if pinecone_result.get('success'):
                print(f"   ✅ Embedding generated and stored ({len(embedding)} dimensions)")
                success_count += 1
            else:
                print(f"   ❌ Pinecone storage failed: {pinecone_result.get('error')}")
                error_count += 1
        
        except Exception as e:
            print(f"   ❌ Error: {e}")
            error_count += 1
        
        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass
    
    print("\n" + "=" * 80)
    print(f"✅ Success: {success_count} / {len(user_images)}")
    print(f"❌ Errors: {error_count} / {len(user_images)}")
    print("=" * 80)
    
    if success_count == len(user_images):
        print("\n🎉 All images now have embeddings!")
        print("   You can now search for them using semantic search.")
    elif success_count > 0:
        print(f"\n⚠️  {success_count} images have embeddings, but {error_count} failed.")
    else:
        print("\n❌ No embeddings were generated successfully.")


if __name__ == "__main__":
    main()

