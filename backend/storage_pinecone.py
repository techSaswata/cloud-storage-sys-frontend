"""
Pinecone vector database integration
Stores and searches embeddings for semantic similarity
"""
from typing import List, Dict, Any, Optional, Tuple, Union
import time

from pinecone import Pinecone, ServerlessSpec
import numpy as np

from config import Config


class PineconeStorage:
    """Pinecone vector storage handler"""
    
    def __init__(self, index_name: Optional[str] = None):
        """
        Initialize Pinecone connection
        
        Args:
            index_name: Name of Pinecone index
        """
        self.index_name = index_name or Config.PINECONE_INDEX_NAME
        
        # Initialize Pinecone
        self.pc = Pinecone(api_key=Config.PINECONE_API_KEY)
        
        # Get or create index
        self._ensure_index_exists()
        
        # Connect to index
        self.index = self.pc.Index(self.index_name)
        
        print(f"Connected to Pinecone index: {self.index_name}")
    
    def _ensure_index_exists(self):
        """Create index if it doesn't exist"""
        try:
            # List existing indexes
            existing_indexes = [index.name for index in self.pc.list_indexes()]
            
            if self.index_name not in existing_indexes:
                print(f"Creating Pinecone index: {self.index_name}")
                
                # Create index with serverless spec
                # CLIP ViT-B/32 generates 512-dimensional embeddings
                # Gemini generates 768-dimensional embeddings
                # CLIP ViT-L/14 generates 768-dimensional embeddings
                # NOTE: Must match TARGET_EMBEDDING_DIM in embedding_service.py
                dimension = 512  # Standard CLIP ViT-B/32 (change to 768 for Gemini)
                
                self.pc.create_index(
                    name=self.index_name,
                    dimension=dimension,
                    metric='cosine',  # Cosine similarity for CLIP embeddings
                    spec=ServerlessSpec(
                        cloud='aws',
                        region=Config.PINECONE_ENVIRONMENT or 'us-east-1'
                    )
                )
                
                # Wait for index to be ready
                print("Waiting for index to be ready...")
                time.sleep(10)  # Give it some time to initialize
                
                print(f"Index {self.index_name} created successfully!")
            else:
                print(f"Index {self.index_name} already exists")
                
        except Exception as e:
            print(f"Error ensuring index exists: {e}")
            raise
    
    def upsert_embedding(self, file_id: str, embedding: np.ndarray,
                        metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Insert or update embedding vector
        
        Args:
            file_id: Unique file identifier
            embedding: Embedding vector (numpy array)
            metadata: Additional metadata to store
            
        Returns:
            Upsert result
        """
        try:
            # Convert numpy array to list
            if isinstance(embedding, np.ndarray):
                embedding = embedding.tolist()
            
            # Prepare metadata (Pinecone has limitations on metadata)
            # Only store basic metadata, full metadata goes to MongoDB/Supabase
            pinecone_metadata = metadata or {}
            
            # Ensure metadata values are simple types
            for key, value in list(pinecone_metadata.items()):
                if isinstance(value, (dict, list)):
                    pinecone_metadata[key] = str(value)
                elif value is None:
                    pinecone_metadata[key] = ''
            
            # Upsert vector
            self.index.upsert(
                vectors=[
                    {
                        'id': file_id,
                        'values': embedding,
                        'metadata': pinecone_metadata
                    }
                ]
            )
            
            return {
                'success': True,
                'file_id': file_id,
                'dimension': len(embedding),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def upsert_embeddings_batch(self, embeddings: List[Tuple[str, np.ndarray, Dict]]) -> Dict[str, Any]:
        """
        Insert or update multiple embeddings in batch
        
        Args:
            embeddings: List of (file_id, embedding, metadata) tuples
            
        Returns:
            Batch upsert result
        """
        try:
            vectors = []
            
            for file_id, embedding, metadata in embeddings:
                # Convert numpy array to list
                if isinstance(embedding, np.ndarray):
                    embedding = embedding.tolist()
                
                # Prepare metadata
                pinecone_metadata = metadata or {}
                for key, value in list(pinecone_metadata.items()):
                    if isinstance(value, (dict, list)):
                        pinecone_metadata[key] = str(value)
                    elif value is None:
                        pinecone_metadata[key] = ''
                
                vectors.append({
                    'id': file_id,
                    'values': embedding,
                    'metadata': pinecone_metadata
                })
            
            # Upsert in batches of 100 (Pinecone limit)
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                self.index.upsert(vectors=batch)
            
            return {
                'success': True,
                'count': len(vectors),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def query(self, query_vector: Union[List[float], np.ndarray], top_k: int = 10,
              filter: Optional[Dict[str, Any]] = None, include_metadata: bool = True) -> Dict[str, Any]:
        """
        Query Pinecone index for similar vectors
        
        Args:
            query_vector: Query embedding vector
            top_k: Number of results to return
            filter: Metadata filters
            include_metadata: Whether to include metadata in results
            
        Returns:
            Dictionary with 'matches' containing list of results
        """
        try:
            # Convert numpy array to list if needed
            if isinstance(query_vector, np.ndarray):
                query_vector = query_vector.tolist()
            
            # Build query parameters
            query_params = {
                'vector': query_vector,
                'top_k': top_k,
                'include_metadata': include_metadata,
            }
            
            if filter:
                query_params['filter'] = filter
            
            # Query Pinecone
            results = self.index.query(**query_params)
            
            return results
            
        except Exception as e:
            print(f"Pinecone query error: {e}")
            return {'matches': []}
    
    def search_similar(self, query_embedding: np.ndarray, top_k: int = 10,
                      filter_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Search for similar embeddings (legacy method, uses query internally)
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            filter_metadata: Metadata filters
            
        Returns:
            List of similar items with scores
        """
        try:
            # Use the query method
            results = self.query(
                query_vector=query_embedding,
                top_k=top_k,
                filter=filter_metadata,
                include_metadata=True
            )
            
            # Convert to legacy format
            return results.get('matches', [])
            
        except Exception as e:
            print(f"Error searching similar embeddings: {e}")
            return []
    
    def get_embedding(self, file_id: str) -> Optional[Dict[str, Any]]:
        """
        Get embedding by file ID
        
        Args:
            file_id: File identifier
            
        Returns:
            Embedding data or None
        """
        try:
            result = self.index.fetch(ids=[file_id])
            
            if file_id in result.get('vectors', {}):
                vector_data = result['vectors'][file_id]
                return {
                    'file_id': file_id,
                    'values': vector_data.get('values'),
                    'metadata': vector_data.get('metadata', {}),
                }
            
            return None
            
        except Exception as e:
            print(f"Error getting embedding: {e}")
            return None
    
    def delete_embedding(self, file_id: str) -> Dict[str, Any]:
        """
        Delete embedding by file ID
        
        Args:
            file_id: File identifier
            
        Returns:
            Deletion result
        """
        try:
            self.index.delete(ids=[file_id])
            
            return {
                'success': True,
                'file_id': file_id,
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def delete_embeddings_batch(self, file_ids: List[str]) -> Dict[str, Any]:
        """
        Delete multiple embeddings
        
        Args:
            file_ids: List of file identifiers
            
        Returns:
            Deletion result
        """
        try:
            self.index.delete(ids=file_ids)
            
            return {
                'success': True,
                'count': len(file_ids),
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def get_index_stats(self) -> Dict[str, Any]:
        """
        Get index statistics
        
        Returns:
            Index stats
        """
        try:
            stats = self.index.describe_index_stats()
            return {
                'success': True,
                'stats': stats,
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def search_by_text(self, text_embedding: np.ndarray, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for media similar to text description
        
        Args:
            text_embedding: Text embedding from CLIP
            top_k: Number of results
            
        Returns:
            List of similar media items
        """
        return self.search_similar(text_embedding, top_k=top_k)


if __name__ == "__main__":
    # Test Pinecone storage
    import sys
    
    try:
        storage = PineconeStorage()
        
        # Get index stats
        print("Index stats:")
        stats = storage.get_index_stats()
        print(stats)
        
        # Test with random embedding
        if len(sys.argv) > 1 and sys.argv[1] == "test":
            print("\nTesting with random embedding...")
            
            # Create random embedding (512 dimensions for ViT-B/32)
            test_embedding = np.random.rand(512).astype(np.float32)
            test_embedding = test_embedding / np.linalg.norm(test_embedding)  # Normalize
            
            # Upsert
            result = storage.upsert_embedding(
                file_id='test_123',
                embedding=test_embedding,
                metadata={'type': 'image', 'format': 'jpg'}
            )
            print(f"\nUpsert result: {result}")
            
            # Search
            print("\nSearching for similar...")
            similar = storage.search_similar(test_embedding, top_k=5)
            print(f"Found {len(similar)} similar items:")
            for item in similar:
                print(f"  - {item['file_id']}: {item['score']:.4f}")
            
            # Delete
            print("\nDeleting test embedding...")
            delete_result = storage.delete_embedding('test_123')
            print(delete_result)
            
    except Exception as e:
        print(f"Error: {e}")
        print("\nMake sure you have set the following environment variables:")
        print("  - PINECONE_API_KEY")
        print("  - PINECONE_ENVIRONMENT")

