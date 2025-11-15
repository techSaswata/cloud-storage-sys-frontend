#!/usr/bin/env python3
"""
Demo: Different scenarios showing when Pinecone is used vs not used
"""
from media_pipeline import MediaProcessor
from storage_db import get_db_storage
from storage_s3 import S3Storage

processor = MediaProcessor()
db = get_db_storage()
s3 = S3Storage()

print("=" * 70)
print("DEMO: When is Pinecone Used?")
print("=" * 70)

# SCENARIO 1: Direct Retrieval (NO PINECONE)
print("\n" + "🔹" * 35)
print("SCENARIO 1: Direct File Retrieval")
print("User has file_id, wants to download it")
print("🔹" * 35)
print("\n❌ Pinecone NOT used - Direct MongoDB → S3")
print("\nSteps:")
print("  1. Get file_id from user input")
print("  2. Query MongoDB for metadata")
print("  3. Download from S3 using s3_key")

# Get a file_id from database
media_list = db.get_all_media(limit=1)
if media_list:
    file_id = media_list[0]['file_id']
    print(f"\nExample: Retrieve file {file_id}")
    print(f"  → MongoDB query: db.get_media('{file_id}')")
    print(f"  → S3 download: s3.download_file(s3_key, local_path)")
    print("  ✓ File downloaded!")

# SCENARIO 2: Text Search (USES PINECONE!)
print("\n\n" + "🔹" * 35)
print("SCENARIO 2: Semantic Text Search")
print("User types: 'show me videos'")
print("🔹" * 35)
print("\n✅ Pinecone IS used - Text → Vector → Similar Files")
print("\nSteps:")
print("  1. User enters text: 'show me videos'")
print("  2. CLIP converts text → 512-dim vector")
print("  3. Pinecone searches for similar vectors")
print("  4. Returns: [file_id_1, file_id_2, ...]")
print("  5. MongoDB gets full metadata for each")
print("  6. Show results to user")

print("\n🔍 Running actual search...")
result = processor.search_similar_media(
    query_type='text',
    query='video content',
    top_k=3
)

if result.get('success'):
    print(f"\n✓ Found {result['count']} results using Pinecone!")
    for i, item in enumerate(result['results'], 1):
        print(f"\n  {i}. {item['file_id']}")
        print(f"     Similarity: {item['similarity_score']:.4f}")
        print(f"     Type: {item['metadata'].get('type')}")

# SCENARIO 3: Visual Similarity (USES PINECONE!)
print("\n\n" + "🔹" * 35)
print("SCENARIO 3: Find Similar Images")
print("User clicks 'Find Similar' button")
print("🔹" * 35)
print("\n✅ Pinecone IS used - Image → Vector → Similar Images")
print("\nSteps:")
print("  1. User clicks 'Find Similar' on an image")
print("  2. Get that image's embedding from Pinecone")
print("  3. Pinecone finds visually similar vectors")
print("  4. Returns: [similar_file_id_1, similar_file_id_2, ...]")
print("  5. MongoDB gets metadata")
print("  6. Display as 'Similar Images' carousel")

if media_list:
    file_id = media_list[0]['file_id']
    print(f"\nExample: Find images similar to {file_id}")
    print(f"  → Get embedding from Pinecone")
    print(f"  → Pinecone.search_similar(embedding, top_k=10)")
    print("  → Return similar images")

# SCENARIO 4: List All Files (NO PINECONE)
print("\n\n" + "🔹" * 35)
print("SCENARIO 4: Gallery View / List All Files")
print("User wants to see all their files")
print("🔹" * 35)
print("\n❌ Pinecone NOT used - Simple MongoDB query")
print("\nSteps:")
print("  1. Query MongoDB: db.get_all_media(limit=100)")
print("  2. Display as grid/list")
print("  3. Generate S3 URLs for thumbnails")

media_list = db.get_all_media(limit=5)
print(f"\n✓ Retrieved {len(media_list)} files from MongoDB")
for media in media_list:
    print(f"  - {media['file_id']} ({media['metadata'].get('type')})")

# SCENARIO 5: Recommendations (USES PINECONE!)
print("\n\n" + "🔹" * 35)
print("SCENARIO 5: Content Recommendations")
print("User views an image, show 'You might also like'")
print("🔹" * 35)
print("\n✅ Pinecone IS used - Recommend similar content")
print("\nSteps:")
print("  1. User opens image detail page")
print("  2. Get that image's embedding from Pinecone")
print("  3. Find top 6 similar images")
print("  4. Display below main image")
print("  5. User discovers related content!")

# SUMMARY
print("\n\n" + "=" * 70)
print("SUMMARY: When to Use Each Component")
print("=" * 70)

print("\n📊 USAGE BREAKDOWN:\n")
print("┌─────────────────────────────────┬──────────┬──────────────┐")
print("│ Feature                         │ Pinecone │ Why          │")
print("├─────────────────────────────────┼──────────┼──────────────┤")
print("│ List all files                  │    ❌    │ MongoDB only │")
print("│ Download by ID                  │    ❌    │ Direct S3    │")
print("│ Filter by date/size             │    ❌    │ MongoDB only │")
print("│ Search by text                  │    ✅    │ Semantic!    │")
print("│ Find similar images             │    ✅    │ Visual!      │")
print("│ Recommendations                 │    ✅    │ Smart!       │")
print("│ Duplicate detection             │    ✅    │ Compare!     │")
print("│ Upload file                     │    ❌    │ Just upload  │")
print("│ Delete file                     │    ❌    │ Just delete  │")
print("└─────────────────────────────────┴──────────┴──────────────┘")

print("\n💡 KEY INSIGHT:")
print("   • Pinecone = SEARCH & DISCOVER (meaning-based)")
print("   • MongoDB = ORGANIZE & RETRIEVE (metadata-based)")
print("   • Supabase S3 = STORE & DELIVER (file storage)")

print("\n🎯 FRONTEND FEATURES TO BUILD:")
print("   1. ✅ Search Bar (uses Pinecone)")
print("   2. ✅ 'Find Similar' button (uses Pinecone)")
print("   3. ✅ 'Recommended' section (uses Pinecone)")
print("   4. ❌ Gallery grid (MongoDB + S3)")
print("   5. ❌ Sort/Filter (MongoDB)")

print("\n" + "=" * 70)

