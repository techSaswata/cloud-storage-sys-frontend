#!/usr/bin/env python3
"""
Retrieve files from storage
"""
from storage_s3 import S3Storage
from storage_db import get_db_storage
from pathlib import Path

print("=" * 60)
print("RETRIEVING FILES FROM STORAGE")
print("=" * 60)

# Initialize storage
s3 = S3Storage()
db = get_db_storage()

# Get all media from database
print("\n1. Getting media list from MongoDB...")
media_list = db.get_all_media(limit=10)
print(f"✓ Found {len(media_list)} media files")

# Create retrieved folder
retrieved_dir = Path("retrieved")
retrieved_dir.mkdir(exist_ok=True)

# Download each file
print("\n2. Downloading files from Supabase S3...")
print("-" * 60)

for media in media_list:
    file_id = media['file_id']
    s3_key = media['s3_info']['s3_key']
    media_type = media['metadata']['type']
    original_format = media['metadata'].get('format', 'unknown')
    
    # Determine file extension
    if media_type == 'image':
        # Check if it was compressed to webp
        if s3_key.endswith('.webp'):
            ext = '.webp'
        else:
            ext = f".{original_format.lower()}"
    elif media_type == 'video':
        ext = '.mp4'
    else:
        ext = '.unknown'
    
    # Local filename
    local_filename = f"{file_id}{ext}"
    local_path = retrieved_dir / local_filename
    
    print(f"\n📥 Downloading: {s3_key}")
    print(f"   File ID: {file_id}")
    print(f"   Type: {media_type}")
    print(f"   Format: {original_format}")
    
    # Download from S3
    result = s3.download_file(s3_key, str(local_path))
    
    if result.get('success'):
        size_mb = result['size'] / (1024 * 1024)
        print(f"   ✓ Downloaded to: {local_path}")
        print(f"   ✓ Size: {size_mb:.2f} MB")
    else:
        print(f"   ❌ Error: {result.get('error')}")

print("\n" + "=" * 60)
print(f"✓ Files retrieved and saved to: {retrieved_dir.absolute()}")
print("=" * 60)

# List what we retrieved
print("\n📁 Retrieved files:")
for file in sorted(retrieved_dir.iterdir()):
    if file.is_file():
        size_mb = file.stat().st_size / (1024 * 1024)
        print(f"   - {file.name} ({size_mb:.2f} MB)")

