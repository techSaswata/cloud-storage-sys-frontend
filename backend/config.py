"""
Configuration management for media storage system
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Application configuration"""
    
    # Object Storage (Supabase S3)
    SUPABASE_PROJECT_ID = os.getenv("SUPABASE_PROJECT_ID")
    AWS_ACCESS_KEY_ID = os.getenv("SUPABASE_S3_ACCESS_KEY")
    AWS_SECRET_ACCESS_KEY = os.getenv("SUPABASE_S3_SECRET_KEY")
    AWS_REGION = os.getenv("SUPABASE_S3_REGION", "us-east-1")
    S3_BUCKET_NAME = os.getenv("SUPABASE_S3_BUCKET")
    S3_ENDPOINT_URL = os.getenv("SUPABASE_S3_ENDPOINT")
    
    # Supabase SQL (PostgreSQL) - for structured tabular data (optional)
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    # MongoDB (for metadata storage)
    MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
    MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "media_storage")
    
    # Pinecone (for embeddings)
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT")
    PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "media-embeddings")
    
    # Application Settings
    UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
    COMPRESSED_DIR = Path(os.getenv("COMPRESSED_DIR", "./compressed"))
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 500000000))  # 500MB
    
    # CLIP Model
    CLIP_MODEL = os.getenv("CLIP_MODEL", "ViT-B/32")
    
    # Compression Settings
    IMAGE_QUALITY = int(os.getenv("IMAGE_QUALITY", 85))
    VIDEO_CRF = int(os.getenv("VIDEO_CRF", 23))
    
    # Supported file types
    SUPPORTED_IMAGE_FORMATS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.svg', '.bmp', '.tiff', '.tif'}
    SUPPORTED_VIDEO_FORMATS = {'.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.wmv', '.m4v'}
    SUPPORTED_AUDIO_FORMATS = {'.mp3', '.m4a', '.wav', '.aac', '.flac', '.ogg', '.wma'}
    
    @classmethod
    def create_directories(cls):
        """Create necessary directories"""
        cls.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        cls.COMPRESSED_DIR.mkdir(parents=True, exist_ok=True)
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        required = []
        
        # Supabase S3 storage
        if not cls.SUPABASE_PROJECT_ID:
            required.append("SUPABASE_PROJECT_ID")
        if not cls.AWS_ACCESS_KEY_ID:
            required.append("SUPABASE_S3_ACCESS_KEY")
        if not cls.AWS_SECRET_ACCESS_KEY:
            required.append("SUPABASE_S3_SECRET_KEY")
        if not cls.S3_BUCKET_NAME:
            required.append("SUPABASE_S3_BUCKET")
        
        # MongoDB for metadata
        if not cls.MONGODB_URI:
            required.append("MONGODB_URI")
        
        # Pinecone for embeddings
        if not cls.PINECONE_API_KEY:
            required.append("PINECONE_API_KEY")
        if not cls.PINECONE_ENVIRONMENT:
            required.append("PINECONE_ENVIRONMENT")
        
        return required

# Create directories on import
Config.create_directories()

