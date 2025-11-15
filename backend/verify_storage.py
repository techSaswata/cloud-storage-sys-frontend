#!/usr/bin/env python3
"""
Verify all storage backends
"""
from storage_s3 import S3Storage
from storage_db import get_db_storage
from storage_pinecone import PineconeStorage

print("=" * 60)
print("STORAGE VERIFICATION")
print("=" * 60)

# 1. Supabase S3
print("\n1. SUPABASE S3 STORAGE")
print("-" * 60)
try:
    s3 = S3Storage()
    result = s3.list_files()
    if result.get('success'):
        print(f"✓ Connected to S3")
        print(f"✓ Files stored: {result['count']}")
        for file in result['files'][:5]:  # Show first 5
            print(f"  - {file['key']} ({file['size']} bytes)")
    else:
        print(f"❌ Error: {result.get('error')}")
except Exception as e:
    print(f"❌ Error: {e}")

# 2. MongoDB
print("\n2. MONGODB")
print("-" * 60)
try:
    db = get_db_storage()
    media_list = db.get_all_media(limit=10)
    print(f"✓ Connected to MongoDB")
    print(f"✓ Media records: {len(media_list)}")
    for media in media_list:
        print(f"  - {media['file_id']}")
        print(f"    Type: {media['metadata'].get('type')}")
        print(f"    Format: {media['metadata'].get('format')}")
except Exception as e:
    print(f"❌ Error: {e}")

# 3. Pinecone
print("\n3. PINECONE VECTOR DATABASE")
print("-" * 60)
try:
    pinecone = PineconeStorage()
    stats = pinecone.get_index_stats()
    if stats.get('success'):
        print(f"✓ Connected to Pinecone")
        print(f"✓ Index stats:")
        index_stats = stats['stats']
        if 'total_vector_count' in index_stats:
            print(f"  - Total vectors: {index_stats['total_vector_count']}")
        if 'dimension' in index_stats:
            print(f"  - Dimension: {index_stats['dimension']}")
        print(f"  - Full stats: {index_stats}")
    else:
        print(f"❌ Error: {stats.get('error')}")
except Exception as e:
    print(f"❌ Error: {e}")

print("\n" + "=" * 60)
print("✓ Storage verification complete!")
print("=" * 60)

