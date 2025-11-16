#!/usr/bin/env python3
"""
Test semantic search for structured JSON data
Tests various queries against the uploaded JSON file
"""

import requests
import json
from typing import Dict, Any, List

# Configuration
API_BASE_URL = "http://localhost:8000"
AUTH_TOKEN = "YOUR_AUTH_TOKEN_HERE"  # Replace with your actual token

def print_separator(title: str = ""):
    """Print a formatted separator"""
    if title:
        print(f"\n{'='*80}")
        print(f"🔍 {title}")
        print('='*80)
    else:
        print('='*80)

def search(query: str, file_types: List[str] = None, limit: int = 10) -> Dict[str, Any]:
    """
    Perform semantic search
    
    Args:
        query: Search query
        file_types: Optional list of file types to filter
        limit: Maximum results
        
    Returns:
        Search results
    """
    url = f"{API_BASE_URL}/api/search"
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": query,
        "limit": limit
    }
    
    if file_types:
        payload["file_types"] = file_types
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        return None

def display_results(results: Dict[str, Any], query: str):
    """Display search results in a formatted way"""
    if not results:
        print("❌ No response from server")
        return
    
    print(f"\n📝 Query: '{query}'")
    print(f"⏱️  Time: {results.get('query_time_ms', 0)}ms")
    print(f"📊 Total Results: {results.get('total', 0)}")
    
    if results.get('results'):
        print("\n" + "─"*80)
        for i, result in enumerate(results['results'], 1):
            print(f"\n{i}. {result.get('file_name', 'Unknown')}")
            print(f"   📁 Type: {result.get('file_type', 'unknown')}")
            print(f"   🎯 Score: {result.get('similarity_score', 0):.4f}")
            print(f"   🆔 File ID: {result.get('file_id', 'unknown')}")
            
            # Show metadata if available
            metadata = result.get('metadata', {})
            if metadata:
                print(f"   📋 Size: {metadata.get('size', 'unknown')} bytes")
                print(f"   📅 Created: {metadata.get('created_at', 'unknown')}")
            
            # Show preview if available
            if result.get('preview'):
                preview = result['preview'][:100] + "..." if len(result.get('preview', '')) > 100 else result['preview']
                print(f"   👁️  Preview: {preview}")
    else:
        print("\n💭 No matching files found")

def main():
    """Run semantic search tests"""
    
    print_separator("SEMANTIC SEARCH TEST FOR STRUCTURED JSON DATA")
    
    print("""
This script tests semantic search against your uploaded JSON file containing:
- User data (Alice with preferences)
- Product data (Laptop with specs)
- Order data (customer orders)

Make sure to:
1. Update AUTH_TOKEN with your actual token from Supabase
2. Ensure the backend server is running on localhost:8000
3. Verify the JSON file was uploaded successfully
""")
    
    # Test queries for the structured data
    test_queries = [
        # User-related queries
        ("user preferences", "Should find Alice's user record with dark theme"),
        ("dark theme settings", "Should find user with dark theme preference"),
        ("notification settings", "Should find user with notification preferences"),
        ("Alice email contact", "Should find Alice's user data"),
        
        # Product-related queries
        ("laptop computer", "Should find the laptop product"),
        ("Intel i7 processor", "Should find laptop with Intel i7 specs"),
        ("16GB RAM computer", "Should find laptop with 16GB RAM"),
        ("512GB SSD storage", "Should find laptop with SSD specs"),
        ("electronics products", "Should find laptop tagged as electronics"),
        ("featured computers", "Should find laptop with 'featured' tag"),
        
        # Order-related queries
        ("customer orders", "Should find order record"),
        ("order number ORD-003", "Should find specific order"),
        ("purchase records", "Should find order data"),
        
        # Cross-record queries
        ("Alice purchases", "Should find Alice and her orders"),
        ("product specifications", "Should find laptop specs"),
        ("customer data", "Should find user/customer records"),
        
        # Generic structured data queries
        ("JSON data", "Should find structured JSON file"),
        ("database records", "Should find structured data"),
    ]
    
    print("\n📋 Running test queries...\n")
    
    success_count = 0
    total_count = len(test_queries)
    
    for query, description in test_queries:
        print_separator(f"Test: {description}")
        results = search(query, file_types=["structured"], limit=5)
        
        if results and results.get('total', 0) > 0:
            success_count += 1
            print("✅ FOUND RESULTS")
        else:
            print("❌ NO RESULTS")
        
        display_results(results, query)
        
        # Small delay between requests
        import time
        time.sleep(0.5)
    
    # Summary
    print_separator("TEST SUMMARY")
    print(f"\n✅ Successful queries: {success_count}/{total_count}")
    print(f"📊 Success rate: {(success_count/total_count)*100:.1f}%")
    
    if success_count < total_count * 0.5:
        print("\n⚠️  Warning: Low success rate!")
        print("Possible issues:")
        print("  1. File might not be properly indexed in Pinecone")
        print("  2. Embedding model mismatch")
        print("  3. User_id filter might be excluding results")
        print("\n💡 Try uploading the JSON file again with the fixed code")

def test_single_query(query: str):
    """Test a single query (useful for interactive testing)"""
    print_separator(f"Single Query Test: '{query}'")
    results = search(query, file_types=["structured"], limit=10)
    display_results(results, query)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Interactive mode: test a single query
        query = " ".join(sys.argv[1:])
        test_single_query(query)
    else:
        # Run full test suite
        main()

