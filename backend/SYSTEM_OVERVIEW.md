# Intelligent Multi-Modal Storage System - Complete Documentation

**Version**: 1.0.0  
**Last Updated**: November 2025  
**System Type**: Adaptive Data Management Platform with Intelligent File Routing

---

## 📚 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Processing Pipelines](#processing-pipelines)
4. [Decision Engine](#decision-engine)
5. [Storage Backends](#storage-backends)
6. [API Reference](#api-reference)
7. [Workflow Examples](#workflow-examples)
8. [Setup & Installation](#setup--installation)
9. [Usage Guide](#usage-guide)
10. [Technical Details](#technical-details)

---

## 🎯 System Overview

### What is This System?

The **Intelligent Multi-Modal Storage System** is an adaptive data management platform that accepts **ANY file type** through a unified interface and intelligently determines how to process and store it using specialized pipelines.

### Key Features

✅ **Universal File Support** - Accepts any file type without restrictions  
✅ **Intelligent Routing** - Automatically detects file type and routes to optimal pipeline  
✅ **Multi-Modal Processing** - Specialized pipelines for media, documents, structured data, code, and generic files  
✅ **Semantic Search** - AI-powered embeddings enable natural language search across all content  
✅ **Adaptive Compression** - Different codecs per modality maximize space savings  
✅ **Hybrid Storage** - Combines SQL, NoSQL, Vector DB, and Object Storage for optimal performance  
✅ **Deduplication** - SHA-256 hashing prevents redundant storage  
✅ **RESTful API** - Easy integration with any frontend or application

### Why This Approach?

Traditional storage systems force all data into one storage paradigm (SQL, NoSQL, or File Storage). This system is **adaptive** - it routes each file to the storage engine(s) that best suit its structure and use case:

- **Structured data** gets SQL optimization
- **Irregular data** gets NoSQL flexibility  
- **Binary files** get efficient object storage
- **Everything** gets semantic searchability through vector embeddings

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────┐
│   Unified Frontend          │
│   (Any File Upload)         │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   Backend Processing API    │
│   (FastAPI REST API)        │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│   Decision Engine           │
│   (Intelligent Router)      │
└───┬───┬───┬───┬────┬────────┘
    │   │   │   │    │
    ▼   ▼   ▼   ▼    ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Media │ │ Doc  │ │Struct│ │ Code │ │Generic│
│Pipe  │ │Pipe  │ │ Pipe │ │ Pipe │ │ Pipe  │
└──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬────┘
   │        │        │        │        │
   └────────┴────────┴────────┴────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌────────┐
   │   S3   │  │ MongoDB │  │Supabase│
   │ Object │  │ (NoSQL) │  │  SQL   │
   │Storage │  │         │  │(Tabular)│
   └────────┘  └─────────┘  └────────┘
                     │
                     ▼
              ┌─────────────┐
              │  Pinecone   │
              │ (Vector DB) │
              └─────────────┘
```

### Core Components

#### 1. **Unified Frontend Interface**
- Single entry point for all uploads
- Accepts any file type
- Optional metadata annotation

#### 2. **Backend Processing API (FastAPI)**
- RESTful API with automatic documentation
- Handles file uploads, search, retrieval
- Routes requests to Decision Engine

#### 3. **Decision Engine (File Router)**
- Intelligent file classifier
- Routes files to appropriate pipelines
- Uses MIME type and file extension detection

#### 4. **Specialized Processing Pipelines**
Five specialized pipelines, each optimized for specific data types:
- **Media Pipeline** - Images, videos, audio
- **Document Pipeline** - PDF, TXT, DOCX
- **Structured Data Pipeline** - JSON, CSV, XML
- **Code Pipeline** - Source code files
- **Generic Pipeline** - Everything else

#### 5. **Storage Layers**
- **S3 Object Storage** - Compressed binary files
- **MongoDB (NoSQL)** - Metadata & unstructured data
- **Supabase SQL** - Structured tabular data
- **Pinecone (Vector DB)** - Semantic embeddings

---

## 🔄 Processing Pipelines

### 1. Media Pipeline

**Supported Formats**: `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`, `.tiff`, `.gif`, `.mp4`, `.mov`, `.avi`, `.mkv`, `.webm`, `.mp3`, `.m4a`, `.wav`, `.flac`, `.aac`, `.ogg`

**Processing Steps**:
1. **Metadata Extraction** - Extract EXIF, resolution, duration, FPS, codec info
2. **Compression** - Optimal codecs (WebP for images, H.265 for video, AAC for audio)
3. **Embedding Generation** - CLIP embeddings for visual content
4. **Storage** - Compressed file → S3, Metadata → MongoDB, Embeddings → Pinecone

**Output**:
- Original or compressed file in S3
- Complete metadata in MongoDB
- Visual embeddings in Pinecone for semantic search

**Code Location**: `media_processor.py`

---

### 2. Document Pipeline

**Supported Formats**: `.pdf`, `.txt`, `.docx`, `.doc`, `.rtf`, `.odt`

**Processing Steps**:
1. **Text Extraction** - Extract text from PDF (PyPDF2) or DOCX (python-docx)
2. **Content Chunking** - Split into overlapping chunks (512 chars with 50 char overlap)
3. **Metadata Extraction** - Page count, word count, author, title
4. **Compression** - Gzip compression (70-90% reduction)
5. **Embedding Generation** - SentenceTransformer embeddings per chunk
6. **Storage** - Compressed file → S3, Metadata → MongoDB, Chunk embeddings → Pinecone

**Output**:
- Compressed document in S3
- Metadata and structure in MongoDB
- Multiple chunk embeddings in Pinecone (one per chunk)

**Special Features**:
- **Semantic Chunking** - Tries to break at sentence boundaries
- **Multiple Embeddings** - Each chunk gets its own embedding for granular search
- **Preview Storage** - First 200 chars of each chunk stored in Pinecone metadata

**Code Location**: `document_pipeline.py`

---

### 3. Structured Data Pipeline

**Supported Formats**: `.json`, `.csv`, `.xml`, `.tsv`, `.yaml`, `.yml`

**Processing Steps**:
1. **Parsing** - Parse file structure
2. **Schema Inference** - Analyze structure (tabular, nested, uniform, irregular)
3. **Storage Decision** - Route to SQL or NoSQL based on schema
4. **Compression** - Gzip compression
5. **Storage** - Compressed file → S3, Data → SQL or NoSQL, Metadata → MongoDB

**Schema Inference Logic**:
```python
if schema['is_tabular'] and schema['is_uniform']:
    storage = 'SQL (Supabase)'  # Tabular, predictable schema
else:
    storage = 'NoSQL (MongoDB)'  # Nested or irregular structure
```

**Storage Decision Matrix**:

| File Type | Structure | Storage Backend |
|-----------|-----------|----------------|
| CSV | Tabular, uniform | Supabase SQL |
| JSON (array of objects) | Tabular, uniform | Supabase SQL |
| JSON (nested) | Nested | MongoDB |
| XML | Nested | MongoDB |

**Output**:
- Compressed file in S3
- Tabular data in Supabase SQL (if applicable)
- Metadata and/or full data in MongoDB

**Code Location**: `structured_data_pipeline.py`

---

### 4. Code Pipeline

**Supported Languages**: Python, Java, C++, C, JavaScript, TypeScript, Go, Rust, Ruby, PHP, Swift, Kotlin, Scala, R, C#, Shell, SQL, HTML, CSS, Dart, Lua, Perl, Jupyter Notebooks

**Supported Extensions**: `.py`, `.java`, `.cpp`, `.c`, `.hpp`, `.h`, `.js`, `.jsx`, `.ts`, `.tsx`, `.go`, `.rs`, `.rb`, `.php`, `.swift`, `.kt`, `.scala`, `.r`, `.m`, `.cs`, `.sh`, `.bash`, `.sql`, `.html`, `.css`, `.vue`, `.dart`, `.lua`, `.pl`, `.ipynb`

**Processing Steps**:
1. **Code Reading** - Multi-encoding support (UTF-8, Latin-1, etc.)
2. **Code Structure Parsing** - Extract functions, classes, imports, comments
3. **Metadata Extraction** - Language detection, line count, structure analysis
4. **Compression** - Gzip compression (typical 70-90% reduction)
5. **Embedding Generation** - CodeBERT embeddings for semantic code search
6. **Storage** - Compressed file → S3, Metadata → MongoDB, Embeddings → Pinecone

**Language-Specific Parsing**:
- **Python**: Functions, classes, imports, docstrings
- **JavaScript/TypeScript**: Functions, classes, imports, comments
- **Java**: Methods, classes, interfaces, imports
- **C/C++**: Functions, classes, structs, includes

**Output**:
- Compressed code file in S3
- Code structure metadata in MongoDB
- CodeBERT embeddings in Pinecone for semantic code search

**Use Cases**:
- Search for code by functionality: "function that validates email"
- Find similar code patterns
- Code repository organization

**Code Location**: `code_pipeline.py`

---

### 5. Generic Pipeline

**Supported Formats**: **ALL other file types** not covered by specialized pipelines

**Processing Steps**:
1. **MIME Type Detection** - Detect file type using magic bytes
2. **Basic Metadata Extraction** - File size, hash, binary/text classification
3. **Compression** - Attempt gzip compression (skip if not beneficial)
4. **Storage** - Compressed/original file → S3, Metadata → MongoDB

**Output**:
- Compressed or original file in S3
- Basic metadata in MongoDB
- No embeddings (semantic search not available)

**Use Cases**:
- Archive storage (.zip, .tar.gz)
- Binary executables
- Proprietary formats
- Unknown file types

**Code Location**: `generic_pipeline.py`

---

## 🧠 Decision Engine

### How It Works

The Decision Engine is the **intelligent router** that determines which pipeline to use for each file.

**Algorithm**:
```python
file_ext = get_file_extension(file)

if file_ext in ['.jpg', '.png', '.mp4', '.mov', '.mp3', ...]:
    route_to → Media Pipeline
    
elif file_ext in ['.pdf', '.txt', '.docx']:
    route_to → Document Pipeline
    
elif file_ext in ['.json', '.csv', '.xml']:
    route_to → Structured Data Pipeline
    
elif file_ext in ['.py', '.java', '.js', '.cpp', ...]:
    route_to → Code Pipeline
    
else:
    route_to → Generic Pipeline
```

### Decision Tree Logic

```
                    File Upload
                        │
                        ▼
                 Get Extension
                        │
            ┌───────────┼───────────┐
            │           │           │
         Media?     Document?   Structured?
         (img/vid)   (pdf/txt)   (json/csv)
            │           │           │
            ▼           ▼           ▼
        [Media]     [Document]  [Struct]
         Pipe        Pipeline    Pipeline
                        │
                    Code?       Generic
                   (.py/.js)    (other)
                        │           │
                        ▼           ▼
                    [Code]      [Generic]
                    Pipeline    Pipeline
```

### Lazy Loading

The Decision Engine uses **lazy loading** - processors are only initialized when first needed, saving memory and startup time.

**Code Location**: `decision_engine.py`

---

## 💾 Storage Backends

### 1. S3 Object Storage (Supabase)

**Purpose**: Store all binary files (compressed when beneficial)

**Configuration**:
```env
SUPABASE_S3_BUCKET=media-files
SUPABASE_S3_ENDPOINT=https://[PROJECT_ID].supabase.co/storage/v1/s3
```

**Storage Structure**:
```
media-files/
├── media/
│   ├── [uuid].webp
│   ├── [uuid].mp4
│   └── [uuid].m4a
├── documents/
│   └── [uuid].gz
├── structured_data/
│   └── [uuid].gz
├── code/
│   └── [uuid].gz
└── generic/
    └── [uuid].gz
```

**Features**:
- Automatic deduplication via SHA-256
- Public or private access control
- CDN acceleration
- Versioning support

---

### 2. MongoDB (NoSQL)

**Purpose**: Store metadata for all files and full data for unstructured content

**Collections**:

#### `media_files` Collection
Stores metadata for ALL file types:

```javascript
{
  "_id": ObjectId("..."),
  "file_id": "uuid-here",
  "metadata": {
    "type": "document|media|code|structured_data|generic",
    "file_name": "report.pdf",
    "file_size": 1048576,
    "extracted_at": "2025-11-12T...",
    // Type-specific fields...
  },
  "s3_info": {
    "s3_key": "documents/uuid.gz",
    "url": "https://...",
    "bucket": "media-files"
  },
  "embedding_info": {
    "dimension": 512,
    "num_chunks": 5,
    "model": "all-MiniLM-L6-v2"
  },
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

**Indexes**:
- `file_id` (unique)
- `metadata.type`
- `created_at`
- `s3_key`

---

### 3. Supabase SQL (PostgreSQL)

**Purpose**: Store structured tabular data for efficient querying

**When Used**: Only for tabular data from CSV or uniform JSON arrays

#### `structured_data` Table Schema

```sql
CREATE TABLE structured_data (
    id BIGSERIAL PRIMARY KEY,
    file_id VARCHAR(255) NOT NULL,
    row_index INTEGER NOT NULL,
    row_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_file_row UNIQUE(file_id, row_index)
);
```

**Example Data**:
```sql
-- CSV: name,age,city
-- Alice,30,NYC
-- Bob,25,LA

-- Stored as:
file_id='abc-123', row_index=0, row_data='{"name":"Alice","age":"30","city":"NYC"}'
file_id='abc-123', row_index=1, row_data='{"name":"Bob","age":"25","city":"LA"}'
```

**Query Examples**:
```sql
-- Get all rows for a file
SELECT * FROM structured_data WHERE file_id = 'abc-123';

-- Query specific field
SELECT row_data->>'name', row_data->>'age'
FROM structured_data
WHERE file_id = 'abc-123';

-- Filter by value
SELECT * FROM structured_data
WHERE row_data->>'city' = 'NYC';
```

**Fallback**: If Supabase SQL is not configured, system uses MongoDB instead.

---

### 4. Pinecone (Vector Database)

**Purpose**: Store embeddings for semantic search across all content

**Index Structure**:
```
Index Name: media-embeddings
Dimension: 512 (SentenceTransformer) or 768 (CodeBERT) or 512 (CLIP)
Metric: cosine similarity
```

**Vector Metadata**:
```python
{
  "file_id": "uuid",
  "type": "document|media|code",
  "original_name": "report.pdf",
  "chunk_index": 0,  # For chunked content
  "chunk_text": "Preview of chunk...",  # First 200 chars
  "language": "Python",  # For code
  "file_extension": ".py"
}
```

**Embedding Models**:
- **Media**: CLIP (ViT-B/32) - 512 dimensions
- **Documents**: SentenceTransformer (all-MiniLM-L6-v2) - 384 dimensions
- **Code**: CodeBERT (microsoft/codebert-base) - 768 dimensions

---

## 🌐 API Reference

### Base URL
```
http://localhost:8000
```

### API Documentation
Interactive API docs available at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

### Endpoints

#### 1. **Upload File** (Universal Endpoint)

```http
POST /upload
```

**Request**:
```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@document.pdf" \
  -F "compress=true" \
  -F "generate_embeddings=true"
```

**Parameters**:
- `file` (required): Any file type
- `compress` (optional, default=true): Whether to compress
- `generate_embeddings` (optional, default=true): Generate embeddings when applicable

**Response**:
```json
{
  "message": "File uploaded and processed successfully",
  "file_id": "abc-123-def",
  "pipeline": "document",
  "pipeline_description": "Document Pipeline (PDF/TXT/DOCX)",
  "metadata": {
    "type": "document",
    "file_name": "report.pdf",
    "word_count": 5000,
    "page_count": 10
  },
  "compression_stats": {
    "original_size": 1048576,
    "compressed_size": 262144,
    "compression_ratio": "75.00%"
  },
  "embedding_info": {
    "num_chunks": 12,
    "dimension": 384,
    "model": "all-MiniLM-L6-v2"
  },
  "s3_url": "https://...",
  "s3_key": "documents/abc-123-def.gz"
}
```

---

#### 2. **Text Search**

```http
POST /search/text?query=machine learning&top_k=10
```

**Example**:
```bash
curl -X POST "http://localhost:8000/search/text?query=machine+learning+tutorial&top_k=5"
```

**Response**:
```json
{
  "query": "machine learning tutorial",
  "results": [
    {
      "file_id": "abc-123",
      "similarity_score": 0.92,
      "metadata": {
        "type": "document",
        "file_name": "ml_guide.pdf"
      }
    }
  ],
  "count": 5
}
```

---

#### 3. **Image Search**

```http
POST /search/image
```

Upload an image to find visually similar content:

```bash
curl -X POST "http://localhost:8000/search/image" \
  -F "file=@query_image.jpg" \
  -F "top_k=10"
```

---

#### 4. **Get File Info**

```http
GET /media/{file_id}
```

**Example**:
```bash
curl "http://localhost:8000/media/abc-123-def"
```

**Response**: Complete file metadata and storage information

---

#### 5. **Delete File**

```http
DELETE /media/{file_id}
```

Deletes file from all storage backends (S3, MongoDB, Pinecone).

---

#### 6. **List All Files**

```http
GET /media?limit=50&skip=0
```

Paginated list of all uploaded files.

---

#### 7. **Get Pipeline Information**

```http
GET /pipelines
```

Returns information about all available pipelines and supported file types.

**Response**:
```json
{
  "pipelines": {
    "media": {
      "description": "Media Pipeline for images, videos, and audio",
      "extensions": [".jpg", ".png", ".mp4", ...],
      "features": ["EXIF extraction", "CLIP embeddings", ...]
    },
    "document": {...},
    "structured_data": {...},
    "code": {...},
    "generic": {...}
  },
  "total_pipelines": 5
}
```

---

#### 8. **Get System Statistics**

```http
GET /stats
```

Returns system statistics including file counts by type and Pinecone vector count.

---

## 📊 Workflow Examples

### Example 1: Upload an Image

```bash
# 1. Upload image
curl -X POST "http://localhost:8000/upload" \
  -F "file=@vacation.jpg"

# Response:
# - Extracts EXIF data
# - Compresses to WebP (30-50% smaller)
# - Generates CLIP embedding
# - Stores: S3 (image) + MongoDB (metadata) + Pinecone (embedding)

# 2. Search for similar images
curl -X POST "http://localhost:8000/search/text?query=beach sunset"

# 3. Or search by image
curl -X POST "http://localhost:8000/search/image" \
  -F "file=@another_vacation.jpg"
```

---

### Example 2: Upload a PDF Document

```bash
# 1. Upload PDF
curl -X POST "http://localhost:8000/upload" \
  -F "file=@research_paper.pdf"

# Processing:
# - Extracts text from all pages
# - Splits into 12 chunks
# - Generates embedding for each chunk
# - Compresses with gzip (75% reduction)
# - Stores: S3 (compressed PDF) + MongoDB (metadata) + Pinecone (12 embeddings)

# 2. Semantic search
curl -X POST "http://localhost:8000/search/text?query=neural networks architecture"

# Returns relevant chunks from the document
```

---

### Example 3: Upload CSV Data

```bash
# 1. Upload CSV file
curl -X POST "http://localhost:8000/upload" \
  -F "file=@sales_data.csv"

# Processing:
# - Parses CSV (1000 rows, 10 columns)
# - Infers schema (tabular, uniform)
# - Decision: Route to Supabase SQL
# - Compresses original file
# - Stores: S3 (compressed CSV) + Supabase SQL (rows) + MongoDB (metadata)

# 2. Can query via SQL
# In Supabase dashboard:
SELECT * FROM structured_data WHERE file_id = 'abc-123';
SELECT row_data->>'product', row_data->>'revenue'
FROM structured_data
WHERE file_id = 'abc-123'
  AND (row_data->>'revenue')::numeric > 1000;
```

---

### Example 4: Upload Source Code

```bash
# 1. Upload Python file
curl -X POST "http://localhost:8000/upload" \
  -F "file=@neural_network.py"

# Processing:
# - Parses code structure (5 classes, 20 functions)
# - Extracts imports, docstrings
# - Generates CodeBERT embedding
# - Compresses with gzip
# - Stores: S3 (compressed) + MongoDB (structure) + Pinecone (embedding)

# 2. Semantic code search
curl -X POST "http://localhost:8000/search/text?query=backpropagation implementation"

# Finds code files implementing backpropagation
```

---

## 🚀 Setup & Installation

### Prerequisites

- Python 3.9+
- MongoDB (local or Atlas)
- Supabase account (for S3 and SQL)
- Pinecone account
- FFmpeg (for video processing)

### Installation Steps

#### 1. Clone Repository

```bash
git clone <repository-url>
cd cloud-storage-sys
```

#### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

#### 4. Configure Environment

Create `.env` file (see `KEYS_NEEDED.md` for detailed setup):

```env
# Supabase S3
SUPABASE_PROJECT_ID=your_project_id
SUPABASE_S3_ACCESS_KEY=your_key
SUPABASE_S3_SECRET_KEY=your_secret
SUPABASE_S3_BUCKET=media-files
SUPABASE_S3_ENDPOINT=https://[PROJECT_ID].supabase.co/storage/v1/s3

# Supabase SQL (optional but recommended)
SUPABASE_URL=https://[PROJECT_ID].supabase.co
SUPABASE_KEY=your_jwt_key

# MongoDB
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DATABASE=media_storage

# Pinecone
PINECONE_API_KEY=your_api_key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=media-embeddings
```

#### 5. Verify Setup

```bash
python setup.py
```

Should show:
```
✓ S3 connection successful
✓ Database connection successful (MongoDB)
✓ Pinecone connection successful
```

#### 6. Start API Server

```bash
python api.py
```

API will be available at:
- **API**: `http://localhost:8000`
- **Docs**: `http://localhost:8000/docs`

---

## 📖 Usage Guide

### Command Line Usage

#### Test Individual Pipelines

```bash
# Media Pipeline
python media_processor.py image.jpg

# Document Pipeline
python document_pipeline.py document.pdf

# Structured Data Pipeline
python structured_data_pipeline.py data.csv

# Code Pipeline
python code_pipeline.py script.py

# Generic Pipeline
python generic_pipeline.py file.bin
```

#### Decision Engine

```bash
# Process any file (auto-routing)
python decision_engine.py any_file.ext

# Show pipeline information
python decision_engine.py --info

# Show system statistics
python decision_engine.py --stats
```

### Python SDK Usage

```python
from decision_engine import DecisionEngine

# Initialize
engine = DecisionEngine()

# Process file
result = engine.route_and_process(
    file_path="document.pdf",
    compress=True,
    generate_embeddings=True
)

print(f"File ID: {result['file_id']}")
print(f"Pipeline: {result['pipeline']}")
```

### API Usage Examples

See [API Reference](#api-reference) section above.

---

## 🔧 Technical Details

### Compression Ratios

| File Type | Codec | Typical Reduction |
|-----------|-------|-------------------|
| Images | WebP | 30-50% |
| Videos | H.265 | 40-60% |
| Audio | AAC | 20-40% |
| Documents | Gzip | 70-90% |
| Code | Gzip | 70-90% |
| Structured Data | Gzip | 60-80% |

### Embedding Models

| Content Type | Model | Dimensions | Use Case |
|--------------|-------|------------|----------|
| Images/Video | CLIP (ViT-B/32) | 512 | Visual similarity search |
| Documents | SentenceTransformer | 384 | Semantic text search |
| Code | CodeBERT | 768 | Semantic code search |

### Performance Metrics

**Processing Speed** (approximate):
- Images: ~0.5-2 seconds
- Videos: ~5-30 seconds (depends on length)
- Documents: ~1-5 seconds (depends on pages)
- Code: ~0.5-2 seconds
- Structured Data: ~1-10 seconds (depends on rows)

**Storage Efficiency**:
- Average compression: 50-70% reduction
- Deduplication prevents redundant storage
- Embeddings: ~3KB per file (excluding chunked documents)

### Scalability

**Horizontal Scaling**:
- Each pipeline can be scaled independently
- Lazy loading minimizes memory usage
- Asynchronous processing for high throughput

**Limitations** (Free Tier):
- Supabase S3: 1GB storage
- Supabase SQL: 500MB database
- MongoDB Atlas: 512MB
- Pinecone: 100K vectors
- **Upgrade to paid tiers for production**

---

## 📋 File Support Matrix

| Pipeline | File Types | Extensions | Compression | Embeddings | Search |
|----------|------------|------------|-------------|------------|--------|
| **Media** | Images, Videos, Audio | .jpg, .png, .mp4, .mp3, .wav, etc. | WebP, H.265, AAC | CLIP | ✅ |
| **Document** | Text Documents | .pdf, .txt, .docx, .odt | Gzip | SentenceTransformer | ✅ |
| **Structured** | Tabular/Hierarchical Data | .json, .csv, .xml, .yaml | Gzip | ❌ | ❌ |
| **Code** | Source Code | .py, .js, .java, .cpp, etc. | Gzip | CodeBERT | ✅ |
| **Generic** | Everything Else | All other extensions | Gzip (if beneficial) | ❌ | ❌ |

---

## 🎯 Key Design Decisions

### 1. **Why Hybrid Storage?**
Different data types have different access patterns:
- **SQL**: Fast joins, structured queries (tabular data)
- **NoSQL**: Flexible schema, fast reads (metadata)
- **Vector DB**: Semantic similarity (embeddings)
- **Object Storage**: Cost-effective binary storage

### 2. **Why Multiple Embeddings for Documents?**
Long documents exceed embedding model limits (512 tokens). Chunking allows:
- Granular search (find specific sections)
- Better relevance scoring
- Support for documents of any length

### 3. **Why Lazy Loading?**
Large models (CLIP, CodeBERT) use significant memory. Lazy loading:
- Reduces startup time
- Saves memory for unused pipelines
- Enables scaling individual pipelines

### 4. **Why Compression?**
- Reduces storage costs by 50-70%
- Faster uploads/downloads
- Same file quality (lossy for media, lossless for docs/code)

### 5. **Why SHA-256 Hashing?**
- Deduplication: Identical files stored once
- Integrity verification
- Content-addressable storage

---

## 🐛 Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
pip install -r requirements.txt
```

**2. FFmpeg not found (video processing)**
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

**3. MongoDB connection refused**
```bash
# macOS
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod
```

**4. Out of memory (loading models)**
- Restart API (models reload only when needed)
- Increase system RAM
- Disable embeddings: `generate_embeddings=false`

**5. Pinecone "Index not found"**
- System auto-creates index on first run
- Wait 10-15 seconds for index initialization
- Check PINECONE_INDEX_NAME in .env

---

## 📚 Additional Resources

- **Setup Guide**: `KEYS_NEEDED.md` - Step-by-step credential setup
- **Quick Start**: `QUICK_START.md` - Get running in 5 minutes
- **Project Plan**: `project_plan.txt` - Original architecture design
- **API Docs**: `http://localhost:8000/docs` - Interactive API documentation

---

## 🎉 Summary

This system provides a **universal file processing platform** that:

✅ Accepts **ANY file type**  
✅ **Intelligently routes** to optimal pipeline  
✅ **Adaptive compression** per modality  
✅ **Semantic search** across all content  
✅ **Hybrid storage** for optimal performance  
✅ **Production-ready** REST API  

**Start uploading files of any type and let the system handle the rest!**

```bash
# Start the API
python api.py

# Upload anything
curl -X POST "http://localhost:8000/upload" -F "file=@anything.xyz"

# Search everything
curl "http://localhost:8000/search/text?query=your search"
```

---

**Questions?** Check `KEYS_NEEDED.md` for setup help or open an issue in the repository.

**Happy Storing! 🚀**

