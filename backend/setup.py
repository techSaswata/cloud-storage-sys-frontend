"""
Setup and validation script
Checks all dependencies and configuration
"""
import sys
import subprocess
import shutil
from pathlib import Path

from config import Config


def check_python_version():
    """Check Python version"""
    print("Checking Python version...")
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ required")
        return False
    print(f"✓ Python {version.major}.{version.minor}.{version.micro}")
    return True


def check_ffmpeg():
    """Check if FFmpeg is installed"""
    print("\nChecking FFmpeg...")
    if shutil.which('ffmpeg') is None:
        print("❌ FFmpeg not found")
        print("Please install FFmpeg:")
        print("  macOS: brew install ffmpeg")
        print("  Ubuntu: sudo apt install ffmpeg")
        print("  Windows: Download from https://ffmpeg.org/download.html")
        return False
    
    # Get FFmpeg version
    try:
        result = subprocess.run(['ffmpeg', '-version'], 
                              capture_output=True, text=True)
        version_line = result.stdout.split('\n')[0]
        print(f"✓ {version_line}")
        return True
    except Exception as e:
        print(f"⚠ FFmpeg found but error getting version: {e}")
        return True


def check_dependencies():
    """Check if all Python dependencies are installed"""
    print("\nChecking Python dependencies...")
    
    required_packages = [
        'PIL',
        'cv2',
        'ffmpeg',
        'torch',
        'clip',
        'boto3',
        'pymongo',
        'pinecone',
        'fastapi',
        'uvicorn',
    ]
    
    missing = []
    
    for package in required_packages:
        try:
            if package == 'PIL':
                import PIL
            elif package == 'cv2':
                import cv2
            elif package == 'ffmpeg':
                import ffmpeg
            elif package == 'torch':
                import torch
            elif package == 'clip':
                import clip
            elif package == 'boto3':
                import boto3
            elif package == 'pymongo':
                import pymongo
            elif package == 'pinecone':
                import pinecone
            elif package == 'fastapi':
                import fastapi
            elif package == 'uvicorn':
                import uvicorn
            
            print(f"✓ {package}")
        except ImportError:
            print(f"❌ {package}")
            missing.append(package)
    
    if missing:
        print(f"\nMissing packages: {', '.join(missing)}")
        print("Install with: pip install -r requirements.txt")
        return False
    
    return True


def check_configuration():
    """Check configuration"""
    print("\nChecking configuration...")
    
    missing = Config.validate()
    
    if missing:
        print("❌ Missing required configuration:")
        for key in missing:
            print(f"  - {key}")
        print("\nPlease set these in your .env file")
        print("See env.example for reference")
        return False
    
    print("✓ All required configuration present")
    return True


def check_directories():
    """Check and create directories"""
    print("\nChecking directories...")
    
    Config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    print(f"✓ Upload directory: {Config.UPLOAD_DIR}")
    
    Config.COMPRESSED_DIR.mkdir(parents=True, exist_ok=True)
    print(f"✓ Compressed directory: {Config.COMPRESSED_DIR}")
    
    return True


def test_connections():
    """Test connections to external services"""
    print("\nTesting connections...")
    
    # Test Supabase S3
    try:
        from storage_s3 import S3Storage
        s3 = S3Storage()
        print("✓ Supabase S3 connection successful")
    except Exception as e:
        print(f"⚠ Supabase S3 connection failed: {e}")
    
    # Test MongoDB
    try:
        from storage_db import get_db_storage
        db = get_db_storage()
        print("✓ MongoDB connection successful")
    except Exception as e:
        print(f"⚠ MongoDB connection failed: {e}")
    
    # Test Pinecone
    try:
        from storage_pinecone import PineconeStorage
        pinecone = PineconeStorage()
        stats = pinecone.get_index_stats()
        print(f"✓ Pinecone connection successful")
    except Exception as e:
        print(f"⚠ Pinecone connection failed: {e}")


def main():
    """Run all checks"""
    print("="*60)
    print("Media Storage System - Setup Validation")
    print("="*60)
    
    checks = [
        ("Python version", check_python_version),
        ("FFmpeg", check_ffmpeg),
        ("Python dependencies", check_dependencies),
        ("Configuration", check_configuration),
        ("Directories", check_directories),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append(result)
        except Exception as e:
            print(f"❌ Error checking {name}: {e}")
            results.append(False)
    
    # Test connections (optional)
    if all(results):
        test_connections()
    
    print("\n" + "="*60)
    if all(results):
        print("✓ All checks passed! System ready to use.")
        print("\nYou can now:")
        print("  1. Process files: python media_processor.py <file_path>")
        print("  2. Start API: python api.py")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        sys.exit(1)
    print("="*60)


if __name__ == "__main__":
    main()

