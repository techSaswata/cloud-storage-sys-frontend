#!/usr/bin/env python3
"""
Check what files are actually in MongoDB
"""
from storage_db import get_db_storage
from dotenv import load_dotenv

load_dotenv()

print("=" * 70)
print("CHECKING MONGODB FILES")
print("=" * 70)
print()

db_storage = get_db_storage()

if db_storage.collection is None:
    print("❌ MongoDB not connected!")
    exit(1)

print("✅ MongoDB connected")
print()

# Get all files (no filter)
all_files = list(db_storage.collection.find().sort('created_at', -1).limit(10))

print(f"📊 Total files in database: {db_storage.collection.count_documents({})}")
print()

if all_files:
    print("📁 Recent files:")
    print()
    for i, file in enumerate(all_files, 1):
        print(f"{i}. File ID: {file.get('file_id', 'Unknown')}")
        print(f"   User ID: {file.get('metadata', {}).get('user_id', 'NOT SET')}")
        print(f"   Filename: {file.get('metadata', {}).get('original_filename', 'Unknown')}")
        print(f"   Type: {file.get('metadata', {}).get('media_type', 'Unknown')}")
        print(f"   Created: {file.get('created_at', 'Unknown')}")
        print()
else:
    print("📁 No files found in database")

print("=" * 70)

