# Intelligent Multi-Modal Storage System

An adaptive data management platform that accepts **ANY file type** through a unified interface and intelligently determines how to process and store it using specialized pipelines.

---

## 📚 Documentation

- **[AUTH.md](AUTH.md)** ⭐ **NEW** - Complete authentication guide for frontend developers
- **[API.md](API.md)** - Complete API reference with all endpoints
- **[RETRIEVAL_GUIDE.md](RETRIEVAL_GUIDE.md)** - Guide for retrieving and displaying files
- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - Comprehensive system documentation (architecture, pipelines)
- **[KEYS_NEEDED.md](KEYS_NEEDED.md)** - Step-by-step setup guide for all credentials
- **[QUICK_START.md](QUICK_START.md)** - Get running in 5 minutes
- **[project_plan.txt](project_plan.txt)** - Original architecture design and rationale

---

## 🌟 Features

### 🔐 Authentication & Security
- **Supabase Auth Integration**: Secure user authentication with JWT tokens
- **User Isolation**: Each user can only access their own files
- **Automatic Ownership**: Files automatically linked to uploading user
- **Token Refresh**: Seamless session management
- **Permission Checks**: 403 errors for unauthorized access

### Universal File Support
- **Media**: Images, videos, audio (JPG, PNG, MP4, MP3, WAV, etc.)
- **Documents**: PDF, TXT, DOCX, ODT, RTF
- **Structured Data**: JSON, CSV, XML, YAML, TSV
- **Source Code**: Python, Java, JavaScript, C++, Go, Rust, and 20+ languages
- **Generic**: ANY other file type (archives, binaries, proprietary formats)

### Intelligent Processing Pipelines

#### 1. Media Pipeline
- **Metadata Extraction**: EXIF, resolution, duration, FPS, codecs
- **Compression**: WebP (images), H.265 (video), AAC (audio)
- **Embeddings**: CLIP for visual semantic search
- **Search**: Text-to-image, image-to-image similarity

#### 2. Document Pipeline
- **Text Extraction**: PDF, DOCX parsing
- **Content Chunking**: Intelligent text splitting with overlap
- **Embeddings**: SentenceTransformer for semantic document search
- **Compression**: Gzip (70-90% reduction)

#### 3. Structured Data Pipeline
- **Schema Inference**: Automatic structure detection
- **Smart Routing**: Tabular → SQL, Nested → NoSQL
- **Storage**: Supabase SQL (for CSV/tabular) or MongoDB (for nested)
- **Query Support**: SQL queries for structured data

#### 4. Code Pipeline
- **Code Parsing**: Extract functions, classes, imports
- **Language Detection**: 20+ programming languages
- **Embeddings**: CodeBERT for semantic code search
- **Structure Analysis**: AST-based metadata extraction

#### 5. Generic Pipeline
- **Universal Support**: Handles any unknown file type
- **MIME Detection**: Magic byte analysis
- **Deduplication**: SHA-256 hashing
- **Compression**: Automatic (if beneficial)

### Core Capabilities
1. **Metadata Extraction**
   - Resolution, format, duration, FPS for videos
   - EXIF data extraction for images
   - Audio codec, bitrate, sample rate information

2. **Media Compression**
   - Images: WebP compression with configurable quality
   - Videos: H.265 (HEVC) / H.264 / AV1 codecs
   - Audio: AAC, Opus, MP3 compression

3. **Visual Embeddings**
   - CLIP-based embeddings for semantic search
   - Support for multiple CLIP models (ViT-B/32, ViT-B/16, ViT-L/14)
   - Text-to-image and image-to-image search

4. **Storage**
   - **Object Storage**: Supabase S3 for media files
   - **Metadata**: MongoDB for structured data
   - **Embeddings**: Pinecone vector database for semantic search

5. **Decision Engine**
   - Automatic file type detection
   - Intelligent routing to optimal pipeline
   - Lazy loading for efficiency
   - Support for ANY file extension

6. **Batch Processing**
   - Parallel folder/multi-file uploads
   - Progress tracking for batch operations
   - Concurrent processing (configurable concurrency)
   - Batch management (status, list, delete)

7. **REST API**
   - FastAPI-based with automatic documentation
   - Universal `/upload` endpoint (accepts any file type)
   - Batch upload endpoint for folders
   - Semantic search by text or image
   - File management (get, delete, list)
   - Pipeline information endpoints

## 📋 Prerequisites

- Python 3.8+
- FFmpeg installed on your system
- Supabase account (for S3 storage)
- MongoDB (local or Atlas)
- Pinecone account

### Installing FFmpeg

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**
Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## 🚀 Installation

1. **Clone or download this repository**

2. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables**

Copy the `env.example` file to `.env` and fill in your credentials:
```bash
cp env.example .env
```

Then edit `.env` with your actual credentials (see Configuration section below).

4. **Validate System Setup**

Run the validation script to ensure all components are correctly configured:

```bash
python validate_system.py
```

This will check:
- All required dependencies are installed
- All modules can be imported
- Configuration is complete
- Decision engine works correctly
- All pipelines are available

## ⚙️ Configuration

### Required Environment Variables

Create a `.env` file with the following variables:

#### Supabase S3 Storage (for media files)
```env
SUPABASE_PROJECT_ID=your_project_id
SUPABASE_S3_ACCESS_KEY=your_s3_access_key
SUPABASE_S3_SECRET_KEY=your_s3_secret_key
SUPABASE_S3_REGION=us-east-1
SUPABASE_S3_BUCKET=your-bucket-name
SUPABASE_S3_ENDPOINT=https://your_project_id.supabase.co/storage/v1/s3
```

#### MongoDB (for metadata storage)
```env
# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DATABASE=media_storage

# OR for MongoDB Atlas (cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/
# MONGODB_DATABASE=media_storage
```

#### Pinecone Vector Database (for embeddings)
```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=media-embeddings
```

#### Optional Settings
```env
UPLOAD_DIR=./uploads
COMPRESSED_DIR=./compressed
MAX_FILE_SIZE=500000000  # 500MB
IMAGE_QUALITY=85
VIDEO_CRF=23
CLIP_MODEL=ViT-B/32  # Options: ViT-B/32, ViT-B/16, ViT-L/14
```

## 📖 Usage

### 1. Command Line Interface

Process a single file:
```bash
python media_processor.py /path/to/your/media/file.jpg
```

This will:
1. Extract metadata
2. Compress the file
3. Generate CLIP embeddings
4. Upload to S3
5. Store metadata in database
6. Store embeddings in Pinecone

### 2. REST API Server

Start the API server:
```bash
python api.py
```

The API will be available at `http://localhost:8000`

Interactive API documentation: `http://localhost:8000/docs`

#### API Endpoints

**Upload Single File (Any Type)**
```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@/path/to/image.jpg" \
  -F "compress=true" \
  -F "generate_embeddings=true"
```

**Upload Batch/Folder (Multiple Files)**
```bash
curl -X POST "http://localhost:8000/upload/batch" \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.pdf" \
  -F "files=@/path/to/file3.py" \
  -F "batch_name=My Project Files" \
  -F "user_id=user123" \
  -F "compress=true" \
  -F "generate_embeddings=true" \
  -F "max_concurrent=5"
```

**Get Batch Status**
```bash
curl "http://localhost:8000/batch/{batch_id}"
```

**List All Batches**
```bash
curl "http://localhost:8000/batches?limit=50"
```

**Delete Entire Batch**
```bash
curl -X DELETE "http://localhost:8000/batch/{batch_id}"
```

**Search by Text**
```bash
curl "http://localhost:8000/search/text?query=beautiful%20sunset&top_k=10"
```

**Search by Image**
```bash
curl -X POST "http://localhost:8000/search/image" \
  -F "file=@/path/to/query_image.jpg" \
  -F "top_k=10"
```

**Get Media Info**
```bash
curl "http://localhost:8000/media/{file_id}"
```

**Delete Media**
```bash
curl -X DELETE "http://localhost:8000/media/{file_id}"
```

**List All Media**
```bash
curl "http://localhost:8000/media?limit=50&skip=0"
```

### 3. Python Library

**Single File Processing**
```python
from decision_engine import DecisionEngine

# Initialize decision engine
engine = DecisionEngine()

# Process any file type (automatically routes to correct pipeline)
result = engine.route_and_process(
    file_path="/path/to/file.jpg",
    compress=True,
    generate_embeddings=True
)

print(f"File ID: {result['file_id']}")
print(f"Pipeline: {result['pipeline']}")
```

**Batch Processing**
```python
import asyncio
from batch_processor import BatchProcessor

async def process_folder():
    # Initialize batch processor
    processor = BatchProcessor()
    
    # Create batch
    batch_id = processor.create_batch(
        batch_name="My Files",
        total_files=10
    )
    
    # Prepare file data
    files_data = [
        {'path': '/path/to/file1.jpg', 'filename': 'file1.jpg'},
        {'path': '/path/to/file2.pdf', 'filename': 'file2.pdf'},
        {'path': '/path/to/file3.py', 'filename': 'file3.py'},
    ]
    
    # Process batch asynchronously with parallel execution
    result = await processor.process_batch_async(
        files_data=files_data,
        batch_id=batch_id,
        compress=True,
        generate_embeddings=True,
        max_concurrent=5  # Process 5 files at once
    )
    
    print(f"Processed: {result['successful']}/{result['total_files']}")
    
    # Get batch status
    status = processor.get_batch_status(batch_id)
    print(f"Progress: {status['progress_percentage']}%")

# Run batch processing
asyncio.run(process_folder())
```

**Search and Retrieval**
```python
from media_pipeline import MediaProcessor

# Initialize processor
processor = MediaProcessor()

# Search for similar media
search_results = processor.search_similar_media(
    query_type='text',
    query='a beautiful sunset over the ocean',
    top_k=10
)

for item in search_results['results']:
    print(f"File: {item['file_id']}, Score: {item['similarity_score']}")

# Get file info
info = processor.get_media_info(file_id='some-file-id')

# Delete file
processor.delete_media(file_id='some-file-id')
```

## 🗂️ Project Structure

```
cloud-storage-sys/
├── Core System
│   ├── config.py                          # Configuration management
│   ├── decision_engine.py                 # Intelligent file routing
│   ├── batch_processor.py                 # Batch/folder upload handler
│   └── api.py                            # FastAPI REST API
│
├── Processing Pipelines
│   ├── media_pipeline.py                  # Media processing (images/videos/audio)
│   ├── document_pipeline.py               # Document processing (PDF/TXT/DOCX)
│   ├── structured_data_pipeline.py        # Structured data (JSON/CSV/XML)
│   ├── code_pipeline.py                   # Code processing (PY/JS/JAVA/etc)
│   └── generic_pipeline.py                # Generic file handler
│
├── Storage Backends
│   ├── storage_s3.py                      # S3 object storage (Supabase)
│   ├── storage_db.py                      # MongoDB/Supabase integration
│   └── storage_pinecone.py                # Pinecone vector database
│
├── Test & Demo
│   ├── test_batch_upload.py              # Batch upload tests
│   ├── validate_system.py                # System validation
│   ├── example_usage.py                  # Usage examples
│   ├── demo_scenarios.py                 # Demo scenarios
│   └── frontend_batch_upload_example.html # Frontend demo
│
├── Documentation
│   ├── README.md                         # This file
│   ├── SYSTEM_OVERVIEW.md                # Complete system docs
│   ├── KEYS_NEEDED.md                    # Setup credentials guide
│   ├── QUICK_START.md                    # Quick start guide
│   └── project_plan.txt                  # Original architecture plan
│
└── Configuration
    ├── requirements.txt                   # Python dependencies
    ├── .env                              # Environment variables (not in git)
    └── env.example                       # Environment template
```

## 🔧 Core Modules

### decision_engine.py
**Intelligent file routing system**
- Analyzes file MIME type and extension
- Routes to appropriate specialized pipeline
- Supports ANY file type with fallback to generic pipeline
- Lazy loading of pipeline modules for efficiency

### batch_processor.py
**Parallel batch processing system**
- Handles multiple file uploads simultaneously
- Async/parallel processing with configurable concurrency
- Progress tracking and status monitoring
- Batch management (create, list, delete)
- Links all files under a single batch ID

### Pipeline Modules

#### media_pipeline.py
- Metadata extraction (EXIF, resolution, duration, FPS)
- Adaptive compression (WebP, H.265, AAC)
- CLIP embeddings for semantic visual search
- Handles images, videos, and audio files

#### document_pipeline.py
- Text extraction from PDF, DOCX, TXT
- Intelligent content chunking with overlap
- SentenceTransformer embeddings
- Gzip compression (70-90% reduction)

#### structured_data_pipeline.py
- Schema inference for JSON, CSV, XML
- Smart routing: tabular → SQL, nested → NoSQL
- Supabase PostgreSQL for structured tables
- MongoDB for irregular/nested data

#### code_pipeline.py
- Language detection (20+ languages)
- AST-based parsing (functions, imports, classes)
- CodeBERT embeddings for semantic code search
- Zstd compression

#### generic_pipeline.py
- MIME type detection via magic bytes
- SHA-256 hashing for deduplication
- Compression (if beneficial)
- Metadata-only storage

### Storage Backends

#### storage_s3.py
- Supabase S3 integration
- Upload/download operations
- Presigned URL generation
- File lifecycle management

#### storage_db.py
- MongoDB for flexible metadata
- Supabase PostgreSQL for structured data
- CRUD operations with indexing
- Query optimization

#### storage_pinecone.py
- Vector embeddings storage
- Semantic similarity search
- Batch upsert operations
- Namespace management

## 🧪 Testing

### Test Batch Upload
```bash
# Run comprehensive batch upload tests
python test_batch_upload.py

# Includes:
# - Multi-file type upload test
# - Batch status tracking
# - Sequential vs parallel performance comparison
```

### Test Individual Pipelines
```bash
# Test decision engine
python decision_engine.py /path/to/any_file.jpg

# Test media pipeline
python media_pipeline.py /path/to/image.jpg

# Test document pipeline
python document_pipeline.py /path/to/document.pdf

# Test code pipeline
python code_pipeline.py /path/to/script.py

# Test S3 storage
python storage_s3.py upload /path/to/file.jpg

# Test Pinecone
python storage_pinecone.py test
```

## 📊 Performance Tips

1. **CLIP Model Selection**
   - `ViT-B/32`: Fastest, good for most use cases
   - `ViT-B/16`: Better quality, slower
   - `ViT-L/14`: Best quality, slowest

2. **Video Processing**
   - Adjust `num_frames` when generating embeddings (default: 10)
   - Use `libx264` for faster encoding, `libx265` for better compression

3. **Compression Settings**
   - Image quality: 80-90 for good balance
   - Video CRF: 18-28 (lower = better quality, larger file)

4. **Batch Processing**
   - Process multiple files in parallel
   - Use batch upsert for Pinecone

## 🛠️ Troubleshooting

### FFmpeg not found
Make sure FFmpeg is installed and in your system PATH.

### CUDA/GPU Support
To use GPU acceleration for CLIP:
```bash
# Install PyTorch with CUDA support
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

### MongoDB Connection Issues
Ensure MongoDB is running:
```bash
# Check MongoDB status
sudo systemctl status mongodb

# Start MongoDB
sudo systemctl start mongodb
```

### Pinecone Index Dimension Mismatch
If you change CLIP models, you'll need to recreate the Pinecone index with the correct dimension:
- ViT-B/32, ViT-B/16: 512 dimensions
- ViT-L/14: 768 dimensions

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 📧 Support

For questions and support, please open an issue on the repository.

---

Built with ❤️ using Python, CLIP, FastAPI, and modern cloud technologies.

