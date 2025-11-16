"""
S3 object storage integration
Handles upload/download of media files to/from S3 or S3-compatible storage
"""
import os
from pathlib import Path
from typing import Optional, Dict, Any
import mimetypes
from datetime import datetime

import boto3
from botocore.exceptions import ClientError

from config import Config


class S3Storage:
    """S3 storage handler"""
    
    def __init__(self):
        """Initialize S3 client"""
        session_kwargs = {
            'aws_access_key_id': Config.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': Config.AWS_SECRET_ACCESS_KEY,
            'region_name': Config.AWS_REGION,
        }
        
        # Create session
        session = boto3.Session(**session_kwargs)
        
        # Create S3 client
        client_kwargs = {}
        if Config.S3_ENDPOINT_URL:
            client_kwargs['endpoint_url'] = Config.S3_ENDPOINT_URL
        
        self.s3_client = session.client('s3', **client_kwargs)
        self.bucket_name = Config.S3_BUCKET_NAME
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                # Bucket doesn't exist, create it
                try:
                    self.s3_client.create_bucket(Bucket=self.bucket_name)
                    print(f"Created S3 bucket: {self.bucket_name}")
                except ClientError as create_error:
                    print(f"Error creating bucket: {create_error}")
            else:
                print(f"Error checking bucket: {e}")
    
    def upload_file(self, local_path: str, s3_key: Optional[str] = None,
                   metadata: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """
        Upload file to S3
        
        Args:
            local_path: Path to local file
            s3_key: S3 object key (path). If None, uses filename.
            metadata: Additional metadata to store with file
            
        Returns:
            Dictionary with upload info
        """
        if not s3_key:
            s3_key = Path(local_path).name
        
        # Detect content type
        content_type, _ = mimetypes.guess_type(local_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Prepare extra args
        extra_args = {
            'ContentType': content_type,
        }
        
        if metadata:
            # Convert metadata values to strings
            string_metadata = {k: str(v) for k, v in metadata.items()}
            extra_args['Metadata'] = string_metadata
        
        try:
            # Upload file
            self.s3_client.upload_file(
                local_path,
                self.bucket_name,
                s3_key,
                ExtraArgs=extra_args
            )
            
            # Generate URL
            url = f"s3://{self.bucket_name}/{s3_key}"
            if Config.S3_ENDPOINT_URL:
                url = f"{Config.S3_ENDPOINT_URL}/{self.bucket_name}/{s3_key}"
            
            return {
                'success': True,
                'bucket': self.bucket_name,
                's3_key': s3_key,
                'url': url,
                'size': os.path.getsize(local_path),
                'content_type': content_type,
                'uploaded_at': datetime.utcnow().isoformat(),
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def download_file(self, s3_key: str, local_path: str) -> Dict[str, Any]:
        """
        Download file from S3
        
        Args:
            s3_key: S3 object key
            local_path: Path to save file locally
            
        Returns:
            Dictionary with download info
        """
        try:
            # Create directory if needed
            Path(local_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Download file
            self.s3_client.download_file(
                self.bucket_name,
                s3_key,
                local_path
            )
            
            return {
                'success': True,
                's3_key': s3_key,
                'local_path': local_path,
                'size': os.path.getsize(local_path),
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def get_file_bytes(self, s3_key: str) -> Optional[bytes]:
        """
        Get file contents as bytes from S3 (without saving to disk)
        
        Args:
            s3_key: S3 object key
            
        Returns:
            File contents as bytes, or None if error
        """
        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            return response['Body'].read()
        except ClientError as e:
            print(f"Error getting file from S3: {e}")
            return None
    
    def delete_file(self, s3_key: str) -> Dict[str, Any]:
        """
        Delete file from S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            Dictionary with deletion info
        """
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return {
                'success': True,
                's3_key': s3_key,
                'deleted_at': datetime.utcnow().isoformat(),
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def get_file_metadata(self, s3_key: str) -> Dict[str, Any]:
        """
        Get file metadata from S3
        
        Args:
            s3_key: S3 object key
            
        Returns:
            Dictionary with file metadata
        """
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=s3_key
            )
            
            return {
                'success': True,
                's3_key': s3_key,
                'size': response.get('ContentLength'),
                'content_type': response.get('ContentType'),
                'last_modified': response.get('LastModified').isoformat() if response.get('LastModified') else None,
                'metadata': response.get('Metadata', {}),
                'etag': response.get('ETag'),
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def list_files(self, prefix: str = '', max_keys: int = 1000) -> Dict[str, Any]:
        """
        List files in S3 bucket
        
        Args:
            prefix: Filter by key prefix
            max_keys: Maximum number of keys to return
            
        Returns:
            Dictionary with list of files
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix,
                MaxKeys=max_keys
            )
            
            files = []
            for obj in response.get('Contents', []):
                files.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    'etag': obj['ETag'],
                })
            
            return {
                'success': True,
                'files': files,
                'count': len(files),
                'is_truncated': response.get('IsTruncated', False),
            }
            
        except ClientError as e:
            return {
                'success': False,
                'error': str(e),
            }
    
    def generate_presigned_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """
        Generate a presigned URL for temporary access
        
        Args:
            s3_key: S3 object key
            expiration: URL expiration time in seconds
            
        Returns:
            Presigned URL or None if error
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': s3_key
                },
                ExpiresIn=expiration
            )
            return url
        except ClientError as e:
            print(f"Error generating presigned URL: {e}")
            return None


# Singleton instance
_s3_storage = None

def get_s3_storage() -> S3Storage:
    """Get singleton S3 storage instance"""
    global _s3_storage
    if _s3_storage is None:
        _s3_storage = S3Storage()
    return _s3_storage


def generate_supabase_signed_url(s3_key: str, expiration: int = 3600) -> Optional[str]:
    """
    Generate a signed URL using Supabase Storage API
    
    For Supabase Storage, we need to use their native API instead of S3 presigned URLs
    because Supabase has its own authentication layer on top of S3.
    
    Args:
        s3_key: S3 object key (e.g., "media/file-id.ext")
        expiration: URL expiration time in seconds (default: 3600 = 1 hour)
        
    Returns:
        Signed URL or None if error
    """
    import requests
    import os
    from urllib.parse import quote
    
    try:
        # Get Supabase credentials from environment
        supabase_url = os.getenv("SUPABASE_URL")
        # Use service_role key for backend operations (has full access)
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        bucket_name = os.getenv("SUPABASE_S3_BUCKET", "media")
        
        if not supabase_url or not supabase_key:
            print("⚠️ Supabase credentials not found, falling back to public URL")
            return f"{supabase_url}/storage/v1/object/public/{bucket_name}/{s3_key}"
        
        # Supabase Storage API endpoint for creating signed URLs
        # Format: POST /storage/v1/object/sign/{bucket}/{path}
        api_url = f"{supabase_url}/storage/v1/object/sign/{bucket_name}/{s3_key}"
        
        headers = {
            "Authorization": f"Bearer {supabase_key}",
            "apikey": supabase_key,
            "Content-Type": "application/json"
        }
        
        # Request signed URL with expiration
        response = requests.post(
            api_url,
            headers=headers,
            json={"expiresIn": expiration},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            # The response contains a signedURL field
            signed_path = data.get("signedURL")
            if signed_path:
                # Construct full URL
                full_url = f"{supabase_url}/storage/v1{signed_path}"
                return full_url
        else:
            print(f"⚠️ Supabase signed URL failed ({response.status_code}): {response.text}")
            # Fallback to public URL
            return f"{supabase_url}/storage/v1/object/public/{bucket_name}/{s3_key}"
            
    except Exception as e:
        print(f"⚠️ Error generating Supabase signed URL: {e}")
        # Fallback to public URL
        supabase_url = os.getenv("SUPABASE_URL", "https://oxcrlwmlpcaeqgouounc.supabase.co")
        bucket_name = os.getenv("SUPABASE_S3_BUCKET", "media")
        return f"{supabase_url}/storage/v1/object/public/{bucket_name}/{s3_key}"
    
    return None


if __name__ == "__main__":
    # Test S3 storage
    import sys
    
    storage = S3Storage()
    
    if len(sys.argv) > 2:
        command = sys.argv[1]
        
        if command == "upload":
            file_path = sys.argv[2]
            result = storage.upload_file(file_path)
            print(result)
        
        elif command == "download":
            s3_key = sys.argv[2]
            local_path = sys.argv[3] if len(sys.argv) > 3 else f"./downloaded_{Path(s3_key).name}"
            result = storage.download_file(s3_key, local_path)
            print(result)
        
        elif command == "list":
            prefix = sys.argv[2] if len(sys.argv) > 2 else ""
            result = storage.list_files(prefix)
            print(result)
    else:
        print("Usage:")
        print("  python storage_s3.py upload <file_path>")
        print("  python storage_s3.py download <s3_key> [local_path]")
        print("  python storage_s3.py list [prefix]")

