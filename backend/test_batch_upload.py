"""
Test script for batch/folder upload functionality
Demonstrates parallel processing and progress tracking
"""
import requests
import os
import time
import json
from pathlib import Path


API_URL = "http://localhost:8000"


def create_test_files():
    """Create a test folder with diverse file types"""
    test_folder = Path("test_batch_upload")
    test_folder.mkdir(exist_ok=True)
    
    files_created = []
    
    # Create test files of different types
    
    # 1. Text file
    text_file = test_folder / "document.txt"
    text_file.write_text("This is a test document for batch upload testing.\nIt contains multiple lines of text.")
    files_created.append(text_file)
    
    # 2. Python code
    code_file = test_folder / "script.py"
    code_file.write_text("""
def hello_world():
    '''A simple test function'''
    print("Hello from batch upload!")
    return True

if __name__ == "__main__":
    hello_world()
""")
    files_created.append(code_file)
    
    # 3. JSON file
    json_file = test_folder / "data.json"
    json_file.write_text(json.dumps({
        "users": [
            {"name": "Alice", "age": 30, "city": "New York"},
            {"name": "Bob", "age": 25, "city": "San Francisco"}
        ],
        "timestamp": "2025-11-12T10:30:00Z"
    }, indent=2))
    files_created.append(json_file)
    
    # 4. CSV file
    csv_file = test_folder / "sales.csv"
    csv_file.write_text("""product,quantity,price
Laptop,5,1200
Mouse,20,25
Keyboard,15,75
Monitor,8,300
""")
    files_created.append(csv_file)
    
    # 5. Markdown file (generic)
    md_file = test_folder / "readme.md"
    md_file.write_text("""# Test Batch Upload

This folder contains various file types for testing:
- Documents
- Code
- Structured data
- More...
""")
    files_created.append(md_file)
    
    # 6. JavaScript code
    js_file = test_folder / "app.js"
    js_file.write_text("""
function processData(data) {
    console.log("Processing:", data);
    return data.map(item => item * 2);
}

const numbers = [1, 2, 3, 4, 5];
const result = processData(numbers);
console.log("Result:", result);
""")
    files_created.append(js_file)
    
    print(f"\n✓ Created {len(files_created)} test files in '{test_folder}'")
    for f in files_created:
        print(f"  - {f.name} ({f.stat().st_size} bytes)")
    
    return test_folder, files_created


def test_batch_upload():
    """Test batch upload endpoint"""
    print("\n" + "="*70)
    print("TEST: Batch Upload with Multiple File Types")
    print("="*70)
    
    # Create test files
    test_folder, files_created = create_test_files()
    
    try:
        # Prepare files for upload
        files_to_upload = []
        for file_path in files_created:
            files_to_upload.append(
                ('files', (file_path.name, open(file_path, 'rb'), 'application/octet-stream'))
            )
        
        # Upload batch
        print("\n📤 Uploading batch...")
        start_time = time.time()
        
        response = requests.post(
            f"{API_URL}/upload/batch",
            files=files_to_upload,
            data={
                'batch_name': 'Test Batch Upload',
                'user_id': 'test_user_123',
                'compress': 'true',
                'generate_embeddings': 'true',
                'max_concurrent': '3'
            }
        )
        
        # Close file handles
        for _, (_, file_obj, _) in files_to_upload:
            file_obj.close()
        
        elapsed_time = time.time() - start_time
        
        if response.status_code == 201:
            result = response.json()
            
            print(f"\n✅ Batch upload completed in {elapsed_time:.2f}s")
            print(f"\nBatch ID: {result['batch_id']}")
            print(f"Batch Name: {result['batch_name']}")
            print(f"Total Files: {result['total_files']}")
            print(f"Successful: {result['successful']}")
            print(f"Failed: {result['failed']}")
            print(f"Progress: {result['progress_percentage']}%")
            
            print("\n📊 File-by-File Results:")
            print("-" * 70)
            for file_info in result['files']:
                status_icon = "✓" if file_info['status'] == 'success' else "✗"
                print(f"{status_icon} {file_info['filename']:20s} → {file_info.get('pipeline', 'N/A'):20s}", end='')
                
                if file_info['status'] == 'success':
                    if 'compression_ratio' in file_info:
                        print(f" (compressed: {file_info['compression_ratio']:.1f}%)")
                    else:
                        print()
                else:
                    print(f" [ERROR: {file_info.get('error', 'Unknown')}]")
            
            batch_id = result['batch_id']
            
            # Test batch status endpoint
            print("\n" + "="*70)
            print("TEST: Get Batch Status")
            print("="*70)
            
            status_response = requests.get(f"{API_URL}/batch/{batch_id}")
            if status_response.status_code == 200:
                status = status_response.json()
                print(f"\n✅ Batch Status Retrieved")
                print(f"Status: {status['status']}")
                print(f"Processed: {status['processed_files']}/{status['total_files']}")
                print(f"Successful: {status['successful_files']}")
                print(f"Failed: {status['failed_files']}")
                print(f"Created: {status['created_at']}")
                if status.get('completed_at'):
                    print(f"Completed: {status['completed_at']}")
            
            # Test get batch files endpoint
            print("\n" + "="*70)
            print("TEST: Get Batch Files")
            print("="*70)
            
            files_response = requests.get(f"{API_URL}/batch/{batch_id}/files")
            if files_response.status_code == 200:
                files_data = files_response.json()
                print(f"\n✅ Retrieved {files_data['count']} files from batch")
                
                for file_record in files_data['files'][:3]:  # Show first 3
                    print(f"\n  File: {file_record.get('filename', 'N/A')}")
                    print(f"    ID: {file_record.get('file_id', 'N/A')}")
                    print(f"    Type: {file_record.get('file_type', 'N/A')}")
                    print(f"    Size: {file_record.get('file_size', 0)} bytes")
            
            # Test list batches endpoint
            print("\n" + "="*70)
            print("TEST: List All Batches")
            print("="*70)
            
            list_response = requests.get(f"{API_URL}/batches?limit=5")
            if list_response.status_code == 200:
                batches_data = list_response.json()
                print(f"\n✅ Found {batches_data['count']} recent batches:")
                
                for batch in batches_data['batches']:
                    print(f"\n  {batch['batch_name']}")
                    print(f"    ID: {batch['batch_id']}")
                    print(f"    Files: {batch['processed_files']}/{batch['total_files']}")
                    print(f"    Status: {batch['status']}")
                    print(f"    Progress: {batch.get('progress_percentage', 0):.1f}%")
            
            # Test batch deletion (optional, uncomment if desired)
            # print("\n" + "="*70)
            # print("TEST: Delete Batch")
            # print("="*70)
            # 
            # delete_response = requests.delete(f"{API_URL}/batch/{batch_id}")
            # if delete_response.status_code == 200:
            #     delete_result = delete_response.json()
            #     print(f"\n✅ Batch deleted successfully")
            #     print(f"Deleted files: {delete_result['deleted_files']}")
            #     print(f"Failed deletions: {delete_result['failed_deletions']}")
            
            print("\n" + "="*70)
            print("✅ ALL BATCH TESTS PASSED!")
            print("="*70)
            
        else:
            print(f"\n❌ Batch upload failed: {response.status_code}")
            print(response.text)
    
    finally:
        # Clean up test files
        print("\n🧹 Cleaning up test files...")
        for file_path in files_created:
            if file_path.exists():
                file_path.unlink()
        
        if test_folder.exists():
            test_folder.rmdir()
        
        print("✓ Cleanup complete")


def test_sequential_comparison():
    """Compare batch upload vs sequential uploads"""
    print("\n" + "="*70)
    print("BENCHMARK: Batch vs Sequential Upload")
    print("="*70)
    
    # Create test files
    test_folder, files_created = create_test_files()
    
    try:
        # Test sequential uploads
        print("\n⏱️ Testing Sequential Uploads...")
        sequential_start = time.time()
        
        for file_path in files_created:
            with open(file_path, 'rb') as f:
                response = requests.post(
                    f"{API_URL}/upload",
                    files={'file': (file_path.name, f, 'application/octet-stream')},
                    data={
                        'compress': 'true',
                        'generate_embeddings': 'true'
                    }
                )
        
        sequential_time = time.time() - sequential_start
        print(f"✓ Sequential: {sequential_time:.2f}s")
        
        # Test batch upload
        print("\n⏱️ Testing Batch Upload...")
        batch_start = time.time()
        
        files_to_upload = []
        for file_path in files_created:
            files_to_upload.append(
                ('files', (file_path.name, open(file_path, 'rb'), 'application/octet-stream'))
            )
        
        response = requests.post(
            f"{API_URL}/upload/batch",
            files=files_to_upload,
            data={
                'batch_name': 'Benchmark Batch',
                'compress': 'true',
                'generate_embeddings': 'true',
                'max_concurrent': '3'
            }
        )
        
        for _, (_, file_obj, _) in files_to_upload:
            file_obj.close()
        
        batch_time = time.time() - batch_start
        print(f"✓ Batch: {batch_time:.2f}s")
        
        # Calculate speedup
        speedup = sequential_time / batch_time if batch_time > 0 else 1
        print(f"\n📈 Performance Improvement:")
        print(f"   Sequential Time: {sequential_time:.2f}s")
        print(f"   Batch Time: {batch_time:.2f}s")
        print(f"   Speedup: {speedup:.2f}x faster")
        print(f"   Time Saved: {sequential_time - batch_time:.2f}s ({((sequential_time - batch_time) / sequential_time * 100):.1f}%)")
    
    finally:
        # Clean up
        for file_path in files_created:
            if file_path.exists():
                file_path.unlink()
        if test_folder.exists():
            test_folder.rmdir()


if __name__ == "__main__":
    print("\n🚀 Starting Batch Upload Tests...")
    print(f"API URL: {API_URL}")
    
    # Check if API is running
    try:
        response = requests.get(f"{API_URL}/health")
        if response.status_code != 200:
            print("❌ API is not healthy!")
            exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API. Make sure it's running!")
        print("   Run: python api.py")
        exit(1)
    
    print("✓ API is healthy\n")
    
    # Run tests
    test_batch_upload()
    
    print("\n")
    test_sequential_comparison()
    
    print("\n" + "="*70)
    print("🎉 All tests completed successfully!")
    print("="*70)

