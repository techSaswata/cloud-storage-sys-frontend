#!/usr/bin/env python3
"""
Regenerate ALL embeddings with Vertex AI (overwrites CLIP embeddings)
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
    print(f"🔄 Regenerating ALL embeddings with Vertex AI")
    print("=" * 80)
    
    # Get services
    db_storage = get_db_storage()
    pinecone_storage = PineconeStorage()
    s3_storage = get_s3_storage()
    embedding_service = get_embedding_service()
    
    if db_storage.collection is None:
        print("   ❌ MongoDB not connected")
        return
    
    # Check if Vertex AI is available
    if not embedding_service._vertex_ai_model:
        print("\n⚠️  Vertex AI is not initialized!")
        print("   Embeddings will be generated with CLIP instead.")
        print("   To use Vertex AI, ensure:")
        print("   - GCP_PROJECT_ID is set in .env")
        print("   - Vertex AI API is enabled")
        print("   - Service account has proper permissions")
        response = input("\n   Continue with CLIP? (y/n): ")
        if response.lower() != 'y':
            return
    else:
        print("\n✅ Vertex AI is ready!")
        print("   Will generate high-quality 1408-dim embeddings (normalized to 512)")
    
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
    
    print("\n⚠️  This will OVERWRITE existing embeddings in Pinecone.")
    response = input("   Continue? (y/n): ")
    if response.lower() != 'y':
        print("   Cancelled.")
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
            model_used = embedding_result.get('model', 'unknown')
            
            # Store in Pinecone (upsert will overwrite)
            print(f"   💾 Storing in Pinecone...")
            pinecone_metadata = {
                'file_id': file_id,
                'type': 'image',
                'format': img.get('metadata', {}).get('format', ''),
                'original_name': file_name,
                'model': model_used,
            }
            
            pinecone_result = pinecone_storage.upsert_embedding(
                file_id=file_id,
                embedding=embedding,
                metadata=pinecone_metadata
            )
            
            if pinecone_result.get('success'):
                print(f"   ✅ Embedding updated ({len(embedding)} dim, {model_used})")
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
        print("\n🎉 All images now have Vertex AI embeddings!")
        print("   Search quality should be significantly improved!")
    elif success_count > 0:
        print(f"\n⚠️  {success_count} images updated, but {error_count} failed.")
    else:
        print("\n❌ No embeddings were generated successfully.")


if __name__ == "__main__":
    main()

