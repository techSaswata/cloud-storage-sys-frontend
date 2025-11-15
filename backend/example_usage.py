"""
Example usage of the media storage system
Demonstrates various features and capabilities
"""
import os
from pathlib import Path

from media_pipeline import MediaProcessor
from config import Config


def example_1_process_single_file():
    """Example 1: Process a single media file"""
    print("\n" + "="*60)
    print("Example 1: Process a single media file")
    print("="*60)
    
    # Initialize processor
    processor = MediaProcessor()
    
    # Example file path (replace with your actual file)
    file_path = "/path/to/your/image.jpg"
    
    if not os.path.exists(file_path):
        print(f"⚠ File not found: {file_path}")
        print("Please update the file_path in this example")
        return
    
    # Process the file
    result = processor.process_media_file(
        file_path=file_path,
        compress=True,
        generate_embeddings=True,
        custom_metadata={
            'description': 'Example image',
            'tags': ['example', 'demo'],
        }
    )
    
    if result.get('success'):
        print(f"\n✓ File processed successfully!")
        print(f"File ID: {result['file_id']}")
        print(f"Media Type: {result['metadata']['type']}")
        print(f"Original Size: {result['metadata']['file_size']} bytes")
        
        if 'compression_stats' in result:
            print(f"Compressed Size: {result['compression_stats']['compressed_size']} bytes")
            print(f"Compression Ratio: {result['compression_stats']['compression_ratio']}")
        
        if 's3_info' in result:
            print(f"S3 URL: {result['s3_info']['url']}")
        
        if 'embedding_info' in result:
            print(f"Embedding Dimension: {result['embedding_info']['dimension']}")
        
        return result['file_id']
    else:
        print(f"❌ Processing failed: {result.get('error')}")
        return None


def example_2_search_by_text(processor):
    """Example 2: Search for media using text query"""
    print("\n" + "="*60)
    print("Example 2: Search by text description")
    print("="*60)
    
    # Search for media matching a text description
    query = "a beautiful sunset over the ocean"
    print(f"Searching for: '{query}'")
    
    result = processor.search_similar_media(
        query_type='text',
        query=query,
        top_k=5
    )
    
    if result.get('success'):
        print(f"\n✓ Found {result['count']} results:")
        for i, item in enumerate(result['results'], 1):
            print(f"\n{i}. File ID: {item['file_id']}")
            print(f"   Similarity: {item['similarity_score']:.4f}")
            print(f"   Type: {item['metadata'].get('type')}")
            print(f"   Format: {item['metadata'].get('format')}")
            if item['s3_info'].get('url'):
                print(f"   URL: {item['s3_info']['url']}")
    else:
        print(f"❌ Search failed: {result.get('error')}")


def example_3_search_by_image(processor):
    """Example 3: Search for similar images"""
    print("\n" + "="*60)
    print("Example 3: Search by image")
    print("="*60)
    
    # Example query image path
    query_image = "/path/to/query_image.jpg"
    
    if not os.path.exists(query_image):
        print(f"⚠ Query image not found: {query_image}")
        print("Please update the query_image path in this example")
        return
    
    print(f"Finding images similar to: {query_image}")
    
    result = processor.search_similar_media(
        query_type='image',
        query=query_image,
        top_k=5
    )
    
    if result.get('success'):
        print(f"\n✓ Found {result['count']} similar images:")
        for i, item in enumerate(result['results'], 1):
            print(f"\n{i}. File ID: {item['file_id']}")
            print(f"   Similarity: {item['similarity_score']:.4f}")
            print(f"   Resolution: {item['metadata'].get('resolution')}")
    else:
        print(f"❌ Search failed: {result.get('error')}")


def example_4_get_media_info(processor, file_id):
    """Example 4: Get complete media information"""
    print("\n" + "="*60)
    print("Example 4: Get media information")
    print("="*60)
    
    print(f"Getting info for file ID: {file_id}")
    
    info = processor.get_media_info(file_id)
    
    if info:
        print("\n✓ Media Information:")
        print(f"Type: {info['metadata'].get('type')}")
        print(f"Format: {info['metadata'].get('format')}")
        print(f"Size: {info['metadata'].get('file_size')} bytes")
        
        if info['metadata']['type'] == 'image':
            print(f"Resolution: {info['metadata'].get('resolution')}")
            if 'exif' in info['metadata']:
                print(f"EXIF data available: {len(info['metadata']['exif'])} fields")
        
        elif info['metadata']['type'] == 'video':
            print(f"Resolution: {info['metadata'].get('resolution')}")
            print(f"Duration: {info['metadata'].get('duration')} seconds")
            print(f"FPS: {info['metadata'].get('fps')}")
            print(f"Codec: {info['metadata'].get('video_codec')}")
        
        print(f"\nCreated: {info.get('created_at')}")
        print(f"S3 Key: {info['s3_info'].get('s3_key')}")
    else:
        print(f"❌ Media not found")


def example_5_batch_processing():
    """Example 5: Process multiple files"""
    print("\n" + "="*60)
    print("Example 5: Batch process multiple files")
    print("="*60)
    
    processor = MediaProcessor()
    
    # Example directory with media files
    media_dir = "/path/to/media/directory"
    
    if not os.path.exists(media_dir):
        print(f"⚠ Directory not found: {media_dir}")
        print("Please update the media_dir path in this example")
        return
    
    # Get all supported media files
    media_files = []
    all_formats = (
        Config.SUPPORTED_IMAGE_FORMATS |
        Config.SUPPORTED_VIDEO_FORMATS |
        Config.SUPPORTED_AUDIO_FORMATS
    )
    
    for file_path in Path(media_dir).iterdir():
        if file_path.suffix.lower() in all_formats:
            media_files.append(str(file_path))
    
    print(f"Found {len(media_files)} media files")
    
    # Process each file
    results = []
    for i, file_path in enumerate(media_files, 1):
        print(f"\nProcessing {i}/{len(media_files)}: {os.path.basename(file_path)}")
        
        result = processor.process_media_file(file_path)
        results.append(result)
    
    # Summary
    successful = sum(1 for r in results if r.get('success'))
    print(f"\n✓ Processed {successful}/{len(media_files)} files successfully")


def example_6_delete_media(processor, file_id):
    """Example 6: Delete a media file"""
    print("\n" + "="*60)
    print("Example 6: Delete media")
    print("="*60)
    
    print(f"Deleting file ID: {file_id}")
    
    # First, get info to show what we're deleting
    info = processor.get_media_info(file_id)
    if info:
        print(f"File: {info['metadata'].get('file_name')}")
        print(f"Type: {info['metadata'].get('type')}")
    
    # Delete
    result = processor.delete_media(file_id)
    
    if result.get('success'):
        print("✓ Media deleted successfully from all storage backends")
    else:
        print(f"❌ Deletion failed: {result.get('error')}")


def main():
    """Run all examples"""
    print("="*60)
    print("Media Storage System - Usage Examples")
    print("="*60)
    
    # Check configuration
    missing = Config.validate()
    if missing:
        print("\n❌ Missing configuration. Please set up your .env file first.")
        print("Missing keys:", missing)
        return
    
    # Initialize processor
    processor = MediaProcessor()
    
    # Run examples (comment out examples you don't want to run)
    
    # Example 1: Process a single file
    file_id = example_1_process_single_file()
    
    if file_id:
        # Example 2: Search by text
        example_2_search_by_text(processor)
        
        # Example 3: Search by image (requires query image)
        # example_3_search_by_image(processor)
        
        # Example 4: Get media info
        example_4_get_media_info(processor, file_id)
        
        # Example 6: Delete media (uncomment to test deletion)
        # example_6_delete_media(processor, file_id)
    
    # Example 5: Batch processing (requires directory of files)
    # example_5_batch_processing()
    
    print("\n" + "="*60)
    print("Examples completed!")
    print("="*60)


if __name__ == "__main__":
    main()

