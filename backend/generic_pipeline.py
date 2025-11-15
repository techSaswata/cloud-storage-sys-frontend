"""
Generic Pipeline for unsupported/unknown file types
Handles compression and storage of any file type
"""
import os
import uuid
import gzip
from pathlib import Path
from typing import Dict, Any, Optional
import hashlib
from datetime import datetime
import mimetypes

from config import Config
from storage_s3 import S3Storage
from storage_db import get_db_storage


class GenericProcessor:
    """Process generic/unknown file types"""
    
    def __init__(self):
        """Initialize generic processor"""
        print("Initializing Generic Processor...")
        
        # Initialize storage backends
        self.s3_storage = S3Storage()
        self.db_storage = get_db_storage()
        
        print("Generic Processor initialized!")
    
    def detect_mime_type(self, file_path: str) -> str:
        """Detect MIME type of file"""
        mime_type, _ = mimetypes.guess_type(file_path)
        
        if mime_type:
            return mime_type
        
        # Try to detect from file signature (magic bytes)
        try:
            with open(file_path, 'rb') as f:
                header = f.read(16)
            
            # Common file signatures
            signatures = {
                b'\x1f\x8b': 'application/gzip',
                b'PK\x03\x04': 'application/zip',
                b'PK\x05\x06': 'application/zip',
                b'%PDF': 'application/pdf',
                b'\x89PNG': 'image/png',
                b'\xff\xd8\xff': 'image/jpeg',
                b'GIF87a': 'image/gif',
                b'GIF89a': 'image/gif',
                b'BM': 'image/bmp',
                b'\x00\x00\x01\x00': 'image/x-icon',
                b'RIFF': 'audio/wav',
                b'ID3': 'audio/mpeg',
                b'\xff\xfb': 'audio/mpeg',
                b'OggS': 'audio/ogg',
            }
            
            for sig, mime in signatures.items():
                if header.startswith(sig):
                    return mime
        except Exception:
            pass
        
        return 'application/octet-stream'
    
    def extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """Extract basic metadata from file"""
        file_ext = Path(file_path).suffix.lower()
        mime_type = self.detect_mime_type(file_path)
        
        metadata = {
            'type': 'generic',
            'file_type': 'generic',
            'file_name': os.path.basename(file_path),
            'file_size': os.path.getsize(file_path),
            'file_extension': file_ext if file_ext else 'none',
            'extension': file_ext if file_ext else 'none',
            'mime_type': mime_type,
            'extracted_at': datetime.utcnow().isoformat(),
        }
        
        # Compute SHA-256 hash for deduplication
        with open(file_path, 'rb') as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        metadata['sha256_hash'] = file_hash
        
        # Try to determine if file is binary or text
        try:
            with open(file_path, 'rb') as f:
                chunk = f.read(1024)
            
            # Check for null bytes (common in binary files)
            is_binary = b'\x00' in chunk
            metadata['is_binary'] = is_binary
            metadata['content_type'] = 'binary' if is_binary else 'text'
            
        except Exception:
            metadata['is_binary'] = True
            metadata['content_type'] = 'binary'
        
        return metadata
    
    def compress_file(self, file_path: str, output_path: Optional[str] = None) -> tuple:
        """
        Compress file using gzip
        
        Args:
            file_path: Path to input file
            output_path: Path for output (optional)
            
        Returns:
            Tuple of (compressed_path, stats)
        """
        input_size = os.path.getsize(file_path)
        
        if not output_path:
            output_path = str(Config.COMPRESSED_DIR / f"{Path(file_path).stem}_compressed.gz")
        
        try:
            with open(file_path, 'rb') as f_in:
                with gzip.open(output_path, 'wb', compresslevel=9) as f_out:
                    f_out.writelines(f_in)
            
            output_size = os.path.getsize(output_path)
            
            # Check if compression actually helped
            if output_size >= input_size:
                # Compression didn't help, delete compressed file and use original
                os.remove(output_path)
                return None, {
                    'original_size': input_size,
                    'compressed_size': input_size,
                    'compression_ratio': '0.00%',
                    'method': 'none',
                    'note': 'File not compressible',
                }
            
            compression_ratio = (1 - output_size / input_size) * 100
            
            stats = {
                'original_size': input_size,
                'compressed_size': output_size,
                'compression_ratio': f"{compression_ratio:.2f}%",
                'method': 'gzip',
            }
            
            return output_path, stats
            
        except Exception as e:
            raise Exception(f"Error compressing file: {str(e)}")
    
    def process_generic_file(self, file_path: str,
                            compress: bool = True,
                            custom_metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process generic file through complete pipeline
        
        Args:
            file_path: Path to file
            compress: Whether to compress the file
            custom_metadata: Additional metadata
            
        Returns:
            Processing result dictionary
        """
        try:
            file_path = str(Path(file_path).absolute())
            file_id = str(uuid.uuid4())
            
            print(f"\n{'='*60}")
            print(f"Processing generic file: {os.path.basename(file_path)}")
            print(f"File ID: {file_id}")
            print(f"{'='*60}\n")
            
            result = {
                'file_id': file_id,
                'original_file': file_path,
                'success': True,
            }
            
            # Step 1: Extract metadata
            print("Step 1: Extracting metadata...")
            metadata = self.extract_metadata(file_path)
            
            if custom_metadata:
                metadata['custom'] = custom_metadata
            
            result['metadata'] = metadata
            print(f"✓ Metadata extracted: {metadata.get('mime_type')} - {metadata.get('file_size')} bytes")
            
            # Step 2: Compress file
            compressed_path = None
            compression_stats = None
            
            if compress:
                print("\nStep 2: Compressing file...")
                try:
                    compressed_path, compression_stats = self.compress_file(file_path)
                    result['compression_stats'] = compression_stats
                    
                    if compressed_path:
                        result['compressed_file'] = compressed_path
                        print(f"✓ Compressed: {compression_stats.get('compression_ratio')} reduction")
                    else:
                        print(f"✓ File not compressible (will store original)")
                        
                except Exception as e:
                    print(f"⚠ Compression failed: {e}")
                    result['compression_error'] = str(e)
            else:
                print("\nStep 2: Skipping compression (not requested)")
            
            # Step 3: Upload to S3
            print("\nStep 3: Uploading to S3...")
            upload_path = compressed_path if compressed_path else file_path
            file_ext = '.gz' if compressed_path else Path(file_path).suffix
            s3_key = f"generic/{file_id}{file_ext}"
            
            s3_info = self.s3_storage.upload_file(
                upload_path,
                s3_key=s3_key,
                metadata={
                    'file_id': file_id,
                    'original_name': os.path.basename(file_path),
                    'type': 'generic',
                }
            )
            
            if s3_info.get('success'):
                result['s3_info'] = s3_info
                print(f"✓ Uploaded to S3: {s3_key}")
            else:
                print(f"⚠ S3 upload failed: {s3_info.get('error')}")
                result['s3_error'] = s3_info.get('error')
            
            # Step 4: Store metadata in MongoDB
            print("\nStep 4: Storing metadata in database...")
            
            db_result = self.db_storage.insert_media(
                file_id=file_id,
                metadata=metadata,
                s3_info=s3_info or {},
                embedding_info=None  # No embeddings for generic files
            )
            
            if db_result.get('success'):
                result['db_info'] = db_result
                print(f"✓ Metadata stored in MongoDB")
            else:
                print(f"⚠ Database storage failed: {db_result.get('error')}")
                result['db_error'] = db_result.get('error')
            
            print(f"\n{'='*60}")
            print(f"✓ Generic file processing complete for {file_id}")
            print(f"{'='*60}\n")
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Generic file processing failed: {str(e)}",
                'file_path': file_path,
            }


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        
        # Initialize processor
        processor = GenericProcessor()
        
        # Process file
        result = processor.process_generic_file(file_path)
        
        # Print summary
        print("\n" + "="*60)
        print("PROCESSING SUMMARY")
        print("="*60)
        
        if result.get('success'):
            print(f"✓ Success!")
            print(f"File ID: {result['file_id']}")
            print(f"MIME Type: {result['metadata'].get('mime_type', 'N/A')}")
            
            if 'compression_stats' in result:
                print(f"Compression: {result['compression_stats']['compression_ratio']}")
        else:
            print(f"❌ Failed: {result.get('error')}")
        
        print("="*60)
    else:
        print("Usage: python generic_pipeline.py <file_path>")
        print("\nExample: python generic_pipeline.py /path/to/file.bin")

