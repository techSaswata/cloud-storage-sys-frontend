"""
Test MongoDB Atlas Connection
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

print("=" * 60)
print("TESTING MONGODB ATLAS CONNECTION")
print("=" * 60)
print()

if not MONGODB_URI:
    print("❌ ERROR: MONGODB_URI not found in .env file")
    exit(1)

# Mask password in URI for display
masked_uri = MONGODB_URI
if "@" in masked_uri and ":" in masked_uri:
    parts = masked_uri.split("://")
    if len(parts) == 2:
        protocol = parts[0]
        rest = parts[1]
        if "@" in rest:
            creds_part = rest.split("@")[0]
            rest_part = "@" + rest.split("@")[1]
            if ":" in creds_part:
                user = creds_part.split(":")[0]
                masked_uri = f"{protocol}://{user}:****{rest_part}"

print(f"📍 MongoDB URI: {masked_uri}")
print()

print("🔌 Attempting connection...")
print()

try:
    # Try connection with SSL options
    client = MongoClient(
        MONGODB_URI,
        serverSelectionTimeoutMS=10000,  # 10 seconds timeout
        tlsAllowInvalidCertificates=True,  # For development
        retryWrites=True,
        w='majority'
    )
    
    # Test connection
    print("⏳ Pinging server...")
    client.admin.command('ping')
    
    print("✅ MongoDB connected successfully!")
    print()
    
    # Get server info
    server_info = client.server_info()
    print(f"📊 MongoDB Version: {server_info.get('version', 'Unknown')}")
    print()
    
    # List databases
    print("📂 Available Databases:")
    dbs = client.list_database_names()
    for db in dbs:
        print(f"   - {db}")
    print()
    
    # Check our database
    db_name = os.getenv("MONGODB_DATABASE", "media_storage")
    db = client[db_name]
    
    print(f"📁 Collections in '{db_name}':")
    collections = db.list_collection_names()
    if collections:
        for coll in collections:
            count = db[coll].count_documents({})
            print(f"   - {coll}: {count} documents")
    else:
        print("   (No collections yet)")
    print()
    
    print("=" * 60)
    print("✅ ALL CHECKS PASSED - MongoDB is working!")
    print("=" * 60)
    
    client.close()

except ServerSelectionTimeoutError as e:
    print("❌ CONNECTION FAILED: Server Selection Timeout")
    print()
    print("This usually means one of:")
    print("  1. MongoDB Atlas IP whitelist doesn't include your IP")
    print("  2. Network/firewall blocking connection")
    print("  3. Incorrect connection string")
    print()
    print(f"Error details: {str(e)}")
    print()
    print("=" * 60)
    print("⚠️  RECOMMENDATION:")
    print("=" * 60)
    print("1. Go to MongoDB Atlas Dashboard")
    print("2. Click 'Network Access' in sidebar")
    print("3. Click 'Add IP Address'")
    print("4. Click 'Allow Access from Anywhere' (0.0.0.0/0)")
    print("5. Save and try again")
    print()

except ConnectionFailure as e:
    print("❌ CONNECTION FAILED: Authentication or SSL Error")
    print()
    print(f"Error details: {str(e)}")
    print()
    print("This usually means:")
    print("  1. Wrong username/password")
    print("  2. SSL/TLS certificate issue")
    print()

except Exception as e:
    print(f"❌ UNEXPECTED ERROR: {type(e).__name__}")
    print()
    print(f"Error details: {str(e)}")
    print()

print()
print("=" * 60)
print("💡 NOTE: The system works even without MongoDB!")
print("   - Files are stored in S3")
print("   - Search works via Pinecone")
print("   - MongoDB is only for listing files")
print("=" * 60)

