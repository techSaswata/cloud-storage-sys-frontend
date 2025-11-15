#!/usr/bin/env python3
"""
Test script to upload a file to the API
Run this AFTER starting the API server (python3 api.py)
"""
import requests
import sys
from pathlib import Path

API_URL = "http://localhost:8000"

def test_upload(file_path):
    """Upload a file to the API"""
    
    print("=" * 60)
    print("TESTING FILE UPLOAD")
    print("=" * 60)
    
    if not Path(file_path).exists():
        print(f"❌ Error: File not found: {file_path}")
        return
    
    print(f"\n📤 Uploading: {file_path}")
    print(f"   API: {API_URL}/upload")
    
    # Prepare the upload
    with open(file_path, 'rb') as f:
        files = {'file': (Path(file_path).name, f, 'application/octet-stream')}
        data = {
            'compress': 'true',
            'generate_embeddings': 'true'
        }
        
        try:
            # Upload
            print("\n⏳ Uploading and processing...")
            response = requests.post(
                f"{API_URL}/upload",
                files=files,
                data=data,
                timeout=300  # 5 minutes timeout for large files
            )
            
            if response.status_code == 201:
                result = response.json()
                print("\n✅ SUCCESS!")
                print("-" * 60)
                print(f"File ID: {result.get('file_id')}")
                print(f"Message: {result.get('message')}")
                
                if 'metadata' in result:
                    meta = result['metadata']
                    print(f"\nMetadata:")
                    print(f"  Type: {meta.get('type')}")
                    print(f"  Format: {meta.get('format')}")
                    if 'resolution' in meta:
                        print(f"  Resolution: {meta.get('resolution')}")
                    print(f"  Size: {meta.get('file_size')} bytes")
                
                if 'compression_stats' in result:
                    stats = result['compression_stats']
                    print(f"\nCompression:")
                    print(f"  Original: {stats.get('original_size')} bytes")
                    print(f"  Compressed: {stats.get('compressed_size')} bytes")
                    print(f"  Ratio: {stats.get('compression_ratio')}")
                
                if 's3_url' in result:
                    print(f"\nS3 URL: {result['s3_url'][:80]}...")
                
                print("\n" + "=" * 60)
                return result.get('file_id')
                
            else:
                print(f"\n❌ Error: HTTP {response.status_code}")
                print(response.text)
                
        except requests.exceptions.ConnectionError:
            print("\n❌ Error: Cannot connect to API server")
            print("   Make sure the server is running:")
            print("   python3 api.py")
        except Exception as e:
            print(f"\n❌ Error: {e}")


def test_search(query):
    """Test text search"""
    print("\n" + "=" * 60)
    print("TESTING TEXT SEARCH")
    print("=" * 60)
    print(f"\n🔍 Query: '{query}'")
    
    try:
        response = requests.post(
            f"{API_URL}/search/text",
            params={'query': query, 'top_k': 5},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Found {result.get('count', 0)} results:")
            
            for i, item in enumerate(result.get('results', []), 1):
                print(f"\n{i}. {item['file_id']}")
                print(f"   Similarity: {item['similarity_score']:.4f}")
                print(f"   Type: {item['metadata'].get('type')}")
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")


def test_list_media():
    """List all media"""
    print("\n" + "=" * 60)
    print("TESTING LIST MEDIA")
    print("=" * 60)
    
    try:
        response = requests.get(f"{API_URL}/media?limit=10")
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ Found {result.get('count', 0)} media files:")
            
            for item in result.get('media', []):
                print(f"\n- {item['file_id']}")
                print(f"  Type: {item['metadata'].get('type')}")
                print(f"  Format: {item['metadata'].get('format')}")
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("""
╔════════════════════════════════════════════════════════════╗
║  API Upload Test Script                                    ║
║  Make sure API server is running: python3 api.py          ║
║  API Docs: http://localhost:8000/docs                     ║
╚════════════════════════════════════════════════════════════╝
    """)
    
    # Check if API is running
    try:
        response = requests.get(f"{API_URL}/health", timeout=2)
        print("✅ API server is running!\n")
    except:
        print("❌ API server is NOT running!")
        print("   Start it with: python3 api.py")
        print("   Then run this script again.\n")
        sys.exit(1)
    
    # Upload test
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        file_id = test_upload(file_path)
        
        if file_id:
            # Test search
            test_search("photo")
    else:
        # Just list existing media
        test_list_media()
        
        print("\n" + "=" * 60)
        print("To upload a file, run:")
        print(f"  python3 {sys.argv[0]} /path/to/file.jpg")
        print("=" * 60)

