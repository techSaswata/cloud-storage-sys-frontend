#!/bin/bash

# Test semantic search for structured JSON data using curl
# This is a quick alternative to the Python script

# Configuration
API_URL="http://localhost:8000/api/search"
AUTH_TOKEN="YOUR_AUTH_TOKEN_HERE"  # Replace with your actual Supabase token

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================================================"
echo "🔍 Testing Semantic Search for Structured JSON Data"
echo "========================================================================"
echo ""

# Function to test a search query
test_search() {
    local query="$1"
    local description="$2"
    
    echo "────────────────────────────────────────────────────────────────────────"
    echo -e "${BLUE}Test:${NC} $description"
    echo -e "${YELLOW}Query:${NC} '$query'"
    echo ""
    
    response=$(curl -s -X POST "$API_URL" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"query\": \"$query\",
            \"file_types\": [\"structured\"],
            \"limit\": 5
        }")
    
    # Check if response contains results
    total=$(echo "$response" | jq -r '.total // 0')
    query_time=$(echo "$response" | jq -r '.query_time_ms // 0')
    
    if [ "$total" -gt 0 ]; then
        echo -e "${GREEN}✅ FOUND $total RESULTS${NC} (${query_time}ms)"
        
        # Display top result
        file_name=$(echo "$response" | jq -r '.results[0].file_name // "unknown"')
        score=$(echo "$response" | jq -r '.results[0].similarity_score // 0')
        file_type=$(echo "$response" | jq -r '.results[0].file_type // "unknown"')
        
        echo "   📁 Top Result: $file_name"
        echo "   🎯 Score: $score"
        echo "   📄 Type: $file_type"
    else
        echo -e "${RED}❌ NO RESULTS${NC}"
    fi
    echo ""
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed${NC}"
    echo "Install it with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Check if AUTH_TOKEN is set
if [ "$AUTH_TOKEN" == "YOUR_AUTH_TOKEN_HERE" ]; then
    echo -e "${RED}Error: Please set AUTH_TOKEN in the script${NC}"
    echo "Get your token from your browser's Developer Tools (Application > Local Storage)"
    exit 1
fi

echo "Testing various semantic queries..."
echo ""

# User-related queries
test_search "user preferences" "Should find Alice's user record"
test_search "dark theme settings" "Should find user with dark theme"
test_search "notification settings" "Should find notification preferences"

# Product-related queries
test_search "laptop computer" "Should find laptop product"
test_search "Intel i7 processor" "Should find laptop with Intel i7"
test_search "16GB RAM computer" "Should find laptop with 16GB RAM"
test_search "electronics products" "Should find electronics"
test_search "featured computers" "Should find featured products"

# Order-related queries
test_search "customer orders" "Should find order records"
test_search "order number" "Should find order data"

# Cross-record queries
test_search "Alice purchases" "Should find user and orders"
test_search "product specifications" "Should find product specs"

# Generic queries
test_search "JSON data" "Should find structured JSON"
test_search "database records" "Should find structured data"

echo "========================================================================"
echo "🏁 Test Complete"
echo "========================================================================"

