#!/usr/bin/env python3
"""
Quick test script for semantic search
"""
from media_pipeline import MediaProcessor

# Initialize processor
processor = MediaProcessor()

# Test search with various queries
queries = [
    "a person",
    "outdoor scene",
    "video content",
]

print("=" * 60)
print("SEMANTIC SEARCH TEST")
print("=" * 60)

for query in queries:
    print(f"\n🔍 Searching for: '{query}'")
    print("-" * 60)
    
    result = processor.search_similar_media(
        query_type='text',
        query=query,
        top_k=5
    )
    
    if result.get('success') and result['results']:
        print(f"✓ Found {result['count']} results:")
        for i, item in enumerate(result['results'], 1):
            print(f"\n{i}. File ID: {item['file_id']}")
            print(f"   Similarity: {item['similarity_score']:.4f}")
            print(f"   Type: {item['metadata'].get('type')}")
            print(f"   Format: {item['metadata'].get('format')}")
            if 'resolution' in item['metadata']:
                print(f"   Resolution: {item['metadata']['resolution']}")
            if 's3_info' in item and 'url' in item['s3_info']:
                print(f"   S3 URL: {item['s3_info']['url'][:80]}...")
    else:
        print("❌ No results found or search failed")

print("\n" + "=" * 60)
print("Search test complete!")
print("=" * 60)

