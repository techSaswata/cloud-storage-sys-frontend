"""
Batch Processor for handling folder/multiple file uploads
Manages parallel processing, progress tracking, and batch operations
"""
import asyncio
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path
import tempfile
import os

from config import Config
from decision_engine import DecisionEngine
from storage_db import get_db_storage


class BatchProcessor:
    """Handle batch/folder uploads with parallel processing"""
    
    def __init__(self):
        """Initialize batch processor"""
        self.decision_engine = DecisionEngine()
        self.db_storage = get_db_storage()
        
        # Create batches collection (if MongoDB is connected)
        if self.db_storage.db is not None:
            try:
                self.batches_collection = self.db_storage.db['batches']
                # Create index on batch_id
                self.batches_collection.create_index('batch_id', unique=True)
            except Exception as e:
                print(f"Warning: Could not create batches collection: {e}")
                self.batches_collection = None
        else:
            print("⚠️ MongoDB not connected - batch tracking disabled")
            self.batches_collection = None
    
    def create_batch(self, batch_name: Optional[str] = None, 
                     user_id: Optional[str] = None,
                     total_files: int = 0) -> str:
        """
        Create a new batch record
        
        Args:
            batch_name: Optional name for the batch
            user_id: Optional user identifier
            total_files: Total number of files in batch
            
        Returns:
            Batch ID
        """
        batch_id = str(uuid.uuid4())
        
        batch_record = {
            'batch_id': batch_id,
            'batch_name': batch_name or f"Batch_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            'user_id': user_id,
            'total_files': total_files,
            'processed_files': 0,
            'successful_files': 0,
            'failed_files': 0,
            'status': 'processing',
            'files': [],
            'errors': [],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'completed_at': None,
        }
        
        # Only save to MongoDB if connected
        if self.batches_collection is not None:
            try:
                self.batches_collection.insert_one(batch_record)
            except Exception as e:
                print(f"Error creating batch: {e}")
        else:
            print(f"⚠️ Batch {batch_id} created (not persisted - MongoDB disconnected)")
        
            return batch_id
    
    def update_batch_progress(self, batch_id: str, file_result: Dict[str, Any]):
        """
        Update batch progress after processing a file
        
        Args:
            batch_id: Batch identifier
            file_result: Result of file processing
        """
        if self.batches_collection is None:
            return  # Skip if MongoDB not connected
        
        try:
            update = {
                '$inc': {
                    'processed_files': 1,
                    'successful_files': 1 if file_result.get('success') else 0,
                    'failed_files': 0 if file_result.get('success') else 1,
                },
                '$push': {
                    'files': {
                        'file_id': file_result.get('file_id'),
                        'filename': file_result.get('filename'),
                        'pipeline': file_result.get('pipeline'),
                        'status': 'success' if file_result.get('success') else 'failed',
                        'error': file_result.get('error'),
                    }
                },
                '$set': {
                    'updated_at': datetime.utcnow()
                }
            }
            
            # Add error to errors array if failed
            if not file_result.get('success'):
                update['$push']['errors'] = {
                    'filename': file_result.get('filename'),
                    'error': file_result.get('error')
                }
            
            self.batches_collection.update_one(
                {'batch_id': batch_id},
                update
            )
        except Exception as e:
            print(f"Error updating batch progress: {e}")
    
    def complete_batch(self, batch_id: str):
        """
        Mark batch as completed
        
        Args:
            batch_id: Batch identifier
        """
        if self.batches_collection is None:
            return  # Skip if MongoDB not connected
        
        try:
            self.batches_collection.update_one(
                {'batch_id': batch_id},
                {
                    '$set': {
                        'status': 'completed',
                        'completed_at': datetime.utcnow(),
                        'updated_at': datetime.utcnow()
                    }
                }
            )
        except Exception as e:
            print(f"Error completing batch: {e}")
    
    async def process_file_async(self, file_path: str, filename: str,
                                 compress: bool = True,
                                 generate_embeddings: bool = True,
                                 custom_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a single file asynchronously
        
        Args:
            file_path: Path to file
            filename: Original filename
            compress: Whether to compress
            generate_embeddings: Whether to generate embeddings
            custom_metadata: Additional metadata
            
        Returns:
            Processing result
        """
        try:
            # Run in executor to not block event loop
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: self.decision_engine.route_and_process(
                    file_path=file_path,
                    compress=compress,
                    generate_embeddings=generate_embeddings,
                    custom_metadata=custom_metadata
                )
            )
            
            result['filename'] = filename
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'filename': filename,
                'file_path': file_path
            }
    
    async def process_batch_async(self, files_data: List[Dict[str, Any]],
                                  batch_id: str,
                                  compress: bool = True,
                                  generate_embeddings: bool = True,
                                  max_concurrent: int = 5,
                                  user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process multiple files in parallel
        
        Args:
            files_data: List of file data dictionaries with 'path' and 'filename'
            batch_id: Batch identifier
            compress: Whether to compress files
            generate_embeddings: Whether to generate embeddings
            max_concurrent: Maximum concurrent file processing
            
        Returns:
            Batch processing results
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_with_semaphore(file_data):
            async with semaphore:
                # Build custom metadata
                file_metadata = {
                    'batch_id': batch_id,
                    'original_filename': file_data['filename']
                }
                if user_id:
                    file_metadata['user_id'] = user_id
                
                result = await self.process_file_async(
                    file_path=file_data['path'],
                    filename=file_data['filename'],
                    compress=compress,
                    generate_embeddings=generate_embeddings,
                    custom_metadata=file_metadata
                )
                
                # Update batch progress
                self.update_batch_progress(batch_id, result)
                
                return result
        
        # Process all files in parallel with concurrency limit
        results = await asyncio.gather(
            *[process_with_semaphore(file_data) for file_data in files_data],
            return_exceptions=True
        )
        
        # Mark batch as completed
        self.complete_batch(batch_id)
        
        # Compile results
        successful = sum(1 for r in results if isinstance(r, dict) and r.get('success'))
        failed = len(results) - successful
        
        return {
            'batch_id': batch_id,
            'total_files': len(files_data),
            'successful': successful,
            'failed': failed,
            'results': [r if isinstance(r, dict) else {'success': False, 'error': str(r)} for r in results]
        }
    
    def get_batch_status(self, batch_id: str) -> Optional[Dict[str, Any]]:
        """
        Get batch processing status
        
        Args:
            batch_id: Batch identifier
            
        Returns:
            Batch status or None
        """
        if self.batches_collection is None:
            return None  # Return None if MongoDB not connected
        
        try:
            batch = self.batches_collection.find_one({'batch_id': batch_id})
            if batch:
                batch['_id'] = str(batch['_id'])
                
                # Calculate progress percentage
                if batch['total_files'] > 0:
                    batch['progress_percentage'] = (batch['processed_files'] / batch['total_files']) * 100
                else:
                    batch['progress_percentage'] = 0
                
                return batch
            return None
        except Exception as e:
            print(f"Error getting batch status: {e}")
            return None
    
    def get_batch_files(self, batch_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get all files in a batch
        
        Args:
            batch_id: Batch identifier
            limit: Maximum files to return
            
        Returns:
            List of file records
        """
        if self.batches_collection is None:
            return []  # Return empty list if MongoDB not connected
        try:
            batch = self.batches_collection.find_one({'batch_id': batch_id})
            if batch and 'files' in batch:
                file_ids = [f['file_id'] for f in batch['files'] if f.get('file_id')]
                
                # Get full file metadata from media_files collection
                files = []
                for file_id in file_ids[:limit]:
                    file_record = self.db_storage.get_media(file_id)
                    if file_record:
                        files.append(file_record)
                
                return files
            return []
        except Exception as e:
            print(f"Error getting batch files: {e}")
            return []
    
    def delete_batch(self, batch_id: str) -> Dict[str, Any]:
        """
        Delete entire batch and all its files
        
        Args:
            batch_id: Batch identifier
            
        Returns:
            Deletion result
        """
        if self.batches_collection is None:
            return {'success': False, 'error': 'MongoDB not connected'}
        
        try:
            # Get batch record
            batch = self.batches_collection.find_one({'batch_id': batch_id})
            if not batch:
                return {
                    'success': False,
                    'error': 'Batch not found'
                }
            
            deleted_files = 0
            failed_deletions = 0
            
            # Delete all files in batch
            for file_info in batch.get('files', []):
                file_id = file_info.get('file_id')
                if file_id:
                    try:
                        # Use media processor to delete from all storage backends
                        delete_result = self.decision_engine.media_processor.delete_media(file_id)
                        if delete_result.get('success'):
                            deleted_files += 1
                        else:
                            failed_deletions += 1
                    except Exception as e:
                        print(f"Error deleting file {file_id}: {e}")
                        failed_deletions += 1
            
            # Delete batch record
            self.batches_collection.delete_one({'batch_id': batch_id})
            
            return {
                'success': True,
                'batch_id': batch_id,
                'deleted_files': deleted_files,
                'failed_deletions': failed_deletions,
                'total_files': len(batch.get('files', []))
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_batches(self, user_id: Optional[str] = None, 
                    limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """
        List all batches (optionally filtered by user)
        
        Args:
            user_id: Optional user ID to filter
            limit: Maximum batches to return
            skip: Number to skip (pagination)
            
        Returns:
            List of batch records
        """
        if self.batches_collection is None:
            return []  # Return empty list if MongoDB not connected
        
        try:
            query = {}
            if user_id:
                query['user_id'] = user_id
            
            batches = list(
                self.batches_collection
                .find(query)
                .sort('created_at', -1)
                .skip(skip)
                .limit(limit)
            )
            
            # Convert ObjectId to string
            for batch in batches:
                batch['_id'] = str(batch['_id'])
                
                # Calculate progress percentage
                if batch['total_files'] > 0:
                    batch['progress_percentage'] = (batch['processed_files'] / batch['total_files']) * 100
                else:
                    batch['progress_percentage'] = 0
            
            return batches
            
        except Exception as e:
            print(f"Error listing batches: {e}")
            return []


if __name__ == "__main__":
    import sys
    
    # Test batch processor
    processor = BatchProcessor()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "list":
            batches = processor.list_batches()
            print(f"\nFound {len(batches)} batches:")
            for batch in batches:
                print(f"  - {batch['batch_name']}: {batch['processed_files']}/{batch['total_files']} files ({batch['status']})")
        
        elif command == "status" and len(sys.argv) > 2:
            batch_id = sys.argv[2]
            status = processor.get_batch_status(batch_id)
            if status:
                print(f"\nBatch: {status['batch_name']}")
                print(f"Status: {status['status']}")
                print(f"Progress: {status['processed_files']}/{status['total_files']} ({status['progress_percentage']:.1f}%)")
                print(f"Successful: {status['successful_files']}")
                print(f"Failed: {status['failed_files']}")
            else:
                print("Batch not found")
        
        else:
            print("Usage:")
            print("  python batch_processor.py list")
            print("  python batch_processor.py status <batch_id>")
    else:
        print("Batch Processor initialized successfully!")

