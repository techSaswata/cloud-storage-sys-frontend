#!/usr/bin/env python3
"""
Check the specific file that was just uploaded
"""
from storage_db import get_db_storage
from dotenv import load_dotenv
import json

load_dotenv()

print("=" * 70)
print("CHECKING FILE: f5762f49-7fea-42cc-aea5-bee078462703")
print("=" * 70)
print()

db_storage = get_db_storage()

if db_storage.collection is None:
    print("❌ MongoDB not connected!")
    exit(1)

# Find the specific file
file = db_storage.collection.find_one({'file_id': 'f5762f49-7fea-42cc-aea5-bee078462703'})

if file:
    print("✅ File found in MongoDB!")
    print()
    print("📋 File Details:")
    print(f"   File ID: {file.get('file_id')}")
    print(f"   Created: {file.get('created_at')}")
    print()
    
    print("📦 Metadata:")
    metadata = file.get('metadata', {})
    print(f"   Type: {metadata.get('type')}")
    print(f"   Filename: {metadata.get('file_name')}")
    print(f"   Original Filename: {metadata.get('original_filename')}")
    print(f"   User ID: {metadata.get('user_id', 'NOT SET ❌')}")
    print(f"   Word Count: {metadata.get('word_count')}")
    print(f"   Char Count: {metadata.get('char_count')}")
    print()
    
    print("☁️  S3 Info:")
    s3_info = file.get('s3_info', {})
    print(f"   Key: {s3_info.get('key')}")
    print(f"   Bucket: {s3_info.get('bucket')}")
    print()
    
    # Check if it has user_id at the root level or in metadata
    root_user_id = file.get('user_id')
    meta_user_id = metadata.get('user_id')
    
    print("🔍 User ID Analysis:")
    print(f"   Root level user_id: {root_user_id or 'NOT SET'}")
    print(f"   Metadata user_id: {meta_user_id or 'NOT SET'}")
    print()
    
    if not root_user_id and not meta_user_id:
        print("❌ PROBLEM: File has NO user_id!")
        print("   The /media endpoint filters by user_id, so this file won't show!")
    elif meta_user_id and not root_user_id:
        print("⚠️  PROBLEM: user_id is in metadata, but /media checks root level!")
    else:
        print("✅ File should be visible!")
else:
    print("❌ File NOT found in MongoDB!")
    print("   File ID: f5762f49-7fea-42cc-aea5-bee078462703")

print()
print("=" * 70)

