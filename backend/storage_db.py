"""
Database storage integration
Supports both MongoDB and Supabase for metadata storage
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, OperationFailure

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

from config import Config


class MongoDBStorage:
    """MongoDB storage handler"""
    
    def __init__(self):
        """Initialize MongoDB connection"""
        try:
            # Add SSL/TLS options for MongoDB Atlas
            self.client = MongoClient(
                Config.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                tlsAllowInvalidCertificates=True,  # For development
                retryWrites=True,
                w='majority'
            )
            # Test connection
            self.client.server_info()
            
            self.db = self.client[Config.MONGODB_DATABASE]
            self.collection = self.db['media_files']
            
            # Create indexes
            self._create_indexes()
            
            print("✅ Connected to MongoDB successfully!")
            
        except ConnectionFailure as e:
            print(f"⚠️ Warning: MongoDB connection failed: {str(e)}")
            print("⚠️ Will create empty storage (no persistence)")
            # Create a mock collection that doesn't fail
            self.client = None
            self.db = None
            self.collection = None
    
    def _create_indexes(self):
        """Create database indexes for better query performance"""
        try:
            # Index on file_id for quick lookups
            self.collection.create_index([('file_id', ASCENDING)], unique=True)
            
            # Index on media type for filtering
            self.collection.create_index([('metadata.type', ASCENDING)])
            
            # Index on upload date for sorting
            self.collection.create_index([('created_at', DESCENDING)])
            
            # Index on S3 key
            self.collection.create_index([('s3_key', ASCENDING)])
            
        except Exception as e:
            print(f"Warning: Could not create indexes: {e}")
    
    def insert_media(self, file_id: str, metadata: Dict[str, Any],
                    s3_info: Dict[str, Any], embedding_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Insert media file record
        
        Args:
            file_id: Unique file identifier
            metadata: Extracted media metadata
            s3_info: S3 storage information
            embedding_info: Embedding information (Pinecone ID, etc.)
            
        Returns:
            Dictionary with insertion result
        """
        if self.collection is None:
            return {
                'success': False,
                'error': 'MongoDB not connected',
            }
            
        try:
            # Extract user_id from custom metadata if present
            user_id = None
            if metadata and 'custom' in metadata:
                user_id = metadata['custom'].get('user_id')
            
            document = {
                'file_id': file_id,
                'metadata': metadata,
                's3_info': s3_info,
                'embedding_info': embedding_info,
                'user_id': user_id,  # Store user_id at root level for filtering
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            
            result = self.collection.insert_one(document)
            
            return {
                'success': True,
                'file_id': file_id,
                'mongo_id': str(result.inserted_id),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def get_media(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        Get media file record by ID
        
        Args:
            file_id: File identifier
            
        Returns:
            Media record or None
        """
        try:
            document = self.collection.find_one({'file_id': file_id})
            if document:
                document['_id'] = str(document['_id'])
            return document
        except Exception as e:
            print(f"Error getting media: {e}")
            return None
    
    def update_media(self, file_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update media file record
        
        Args:
            file_id: File identifier
            updates: Fields to update
            
        Returns:
            Update result
        """
        try:
            updates['updated_at'] = datetime.utcnow()
            
            result = self.collection.update_one(
                {'file_id': file_id},
                {'$set': updates}
            )
            
            return {
                'success': True,
                'matched': result.matched_count,
                'modified': result.modified_count,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def delete_media(self, file_id: str) -> Dict[str, Any]:
        """
        Delete media file record
        
        Args:
            file_id: File identifier
            
        Returns:
            Deletion result
        """
        try:
            result = self.collection.delete_one({'file_id': file_id})
            
            return {
                'success': True,
                'deleted': result.deleted_count,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def search_media(self, query: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search media files
        
        Args:
            query: MongoDB query
            limit: Maximum results
            
        Returns:
            List of matching media records
        """
        try:
            cursor = self.collection.find(query).limit(limit).sort('created_at', DESCENDING)
            results = []
            
            for doc in cursor:
                doc['_id'] = str(doc['_id'])
                results.append(doc)
            
            return results
            
        except Exception as e:
            print(f"Error searching media: {e}")
            return []
    
    def get_all_media(self, limit: int = 100, skip: int = 0) -> List[Dict[str, Any]]:
        """
        Get all media files with pagination
        
        Args:
            limit: Maximum results per page
            skip: Number of records to skip
            
        Returns:
            List of media records
        """
        return self.search_media({}, limit=limit)
    
    def close(self):
        """Close database connection"""
        if hasattr(self, 'client'):
            self.client.close()


class SupabaseStorage:
    """Supabase storage handler"""
    
    def __init__(self):
        """Initialize Supabase connection"""
        if not SUPABASE_AVAILABLE:
            raise ImportError("Supabase library not installed. Install with: pip install supabase")
        
        if not Config.SUPABASE_URL or not Config.SUPABASE_KEY:
            raise ValueError("Supabase URL and KEY required")
        
        try:
            self.client: Client = create_client(Config.SUPABASE_URL, Config.SUPABASE_KEY)
            self.table_name = 'media_files'
            
            print("Connected to Supabase successfully!")
            
        except Exception as e:
            raise Exception(f"Failed to connect to Supabase: {str(e)}")
    
    def insert_media(self, file_id: str, metadata: Dict[str, Any],
                    s3_info: Dict[str, Any], embedding_info: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Insert media file record
        
        Args:
            file_id: Unique file identifier
            metadata: Extracted media metadata
            s3_info: S3 storage information
            embedding_info: Embedding information
            
        Returns:
            Dictionary with insertion result
        """
        try:
            document = {
                'file_id': file_id,
                'metadata': metadata,
                's3_info': s3_info,
                'embedding_info': embedding_info,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
            }
            
            result = self.client.table(self.table_name).insert(document).execute()
            
            return {
                'success': True,
                'file_id': file_id,
                'data': result.data,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def get_media(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        Get media file record by ID
        
        Args:
            file_id: File identifier
            
        Returns:
            Media record or None
        """
        try:
            result = self.client.table(self.table_name).select("*").eq('file_id', file_id).execute()
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            print(f"Error getting media: {e}")
            return None
    
    def update_media(self, file_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update media file record
        
        Args:
            file_id: File identifier
            updates: Fields to update
            
        Returns:
            Update result
        """
        try:
            updates['updated_at'] = datetime.utcnow().isoformat()
            
            result = self.client.table(self.table_name).update(updates).eq('file_id', file_id).execute()
            
            return {
                'success': True,
                'data': result.data,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def delete_media(self, file_id: str) -> Dict[str, Any]:
        """
        Delete media file record
        
        Args:
            file_id: File identifier
            
        Returns:
            Deletion result
        """
        try:
            result = self.client.table(self.table_name).delete().eq('file_id', file_id).execute()
            
            return {
                'success': True,
                'data': result.data,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def search_media(self, filters: Dict[str, Any], limit: int = 100) -> List[Dict[str, Any]]:
        """
        Search media files
        
        Args:
            filters: Filter criteria
            limit: Maximum results
            
        Returns:
            List of matching media records
        """
        try:
            query = self.client.table(self.table_name).select("*")
            
            # Apply filters
            for key, value in filters.items():
                query = query.eq(key, value)
            
            result = query.limit(limit).order('created_at', desc=True).execute()
            
            return result.data if result.data else []
            
        except Exception as e:
            print(f"Error searching media: {e}")
            return []
    
    def get_all_media(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Get all media files with pagination
        
        Args:
            limit: Maximum results per page
            offset: Number of records to skip
            
        Returns:
            List of media records
        """
        try:
            result = self.client.table(self.table_name).select("*").range(offset, offset + limit - 1).execute()
            return result.data if result.data else []
        except Exception as e:
            print(f"Error getting all media: {e}")
            return []


# Singleton instance
_db_storage_instance = None

def get_db_storage():
    """
    Factory function to get database storage (singleton)
    
    Returns:
        MongoDB storage instance
    """
    global _db_storage_instance
    if _db_storage_instance is None:
        _db_storage_instance = MongoDBStorage()
    return _db_storage_instance


if __name__ == "__main__":
    # Test database storage
    storage = get_db_storage()
    
    # Test insert
    test_data = {
        'file_id': 'test_123',
        'metadata': {'type': 'image', 'format': 'jpg'},
        's3_info': {'bucket': 'test', 's3_key': 'test.jpg'},
    }
    
    print("Inserting test record...")
    result = storage.insert_media(**test_data)
    print(result)
    
    if result.get('success'):
        print("\nGetting record...")
        record = storage.get_media('test_123')
        print(record)
        
        print("\nDeleting record...")
        delete_result = storage.delete_media('test_123')
        print(delete_result)

