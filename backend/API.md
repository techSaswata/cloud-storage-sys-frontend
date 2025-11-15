# 🚀 API Documentation

**Base URL:** `http://localhost:8000`

**API Version:** 1.0.0

This document provides complete API reference for frontend developers building clients for the Intelligent Multi-Modal Storage System.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [File Upload](#file-upload)
3. [Batch Operations](#batch-operations)
4. [File Retrieval](#file-retrieval) ⭐ **NEW**
5. [Search Operations](#search-operations)
6. [File Management](#file-management)
7. [System Information](#system-information)
8. [Error Handling](#error-handling)
9. [Frontend Examples](#frontend-examples)

---

## Overview

### Base Information

- **Protocol:** HTTP/HTTPS
- **Content-Type:** `multipart/form-data` (for uploads), `application/json` (for queries)
- **Authentication:** None (can be added later)
- **CORS:** Enabled for all origins

### Quick Start

```javascript
const API_BASE = 'http://localhost:8000';
```

---

## File Upload

### 1. Upload Single File

**Endpoint:** `POST /upload`

**Description:** Upload and process a single file of ANY type. The system automatically detects the file type and routes it to the appropriate pipeline.

**Request:**

```http
POST /upload
Content-Type: multipart/form-data

Parameters:
- file: File (required) - The file to upload
- compress: Boolean (optional, default: true) - Enable compression
- generate_embeddings: Boolean (optional, default: true) - Generate embeddings for search
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/upload" \
  -F "file=@/path/to/file.jpg" \
  -F "compress=true" \
  -F "generate_embeddings=true"
```

**JavaScript/Fetch Example:**

```javascript
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('compress', 'true');
  formData.append('generate_embeddings', 'true');

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData
  });

  return await response.json();
}

// Usage with file input
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const result = await uploadFile(file);
  console.log('Uploaded:', result);
});
```

**Response (Success - 201 Created):**

```json
{
  "message": "File uploaded and processed successfully",
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "pipeline": "media",
  "pipeline_description": "Media Pipeline - Images, Videos, Audio",
  "metadata": {
    "filename": "photo.jpg",
    "file_type": "image",
    "file_size": 2048576,
    "mime_type": "image/jpeg",
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "created_at": "2025-11-12T10:30:00Z"
  },
  "compression_stats": {
    "original_size": 2048576,
    "compressed_size": 1024288,
    "compression_ratio": 50.0,
    "format": "webp"
  },
  "s3_url": "https://bucket.supabase.co/storage/v1/object/public/media/...",
  "s3_key": "media/2025/11/550e8400-e29b-41d4-a716-446655440000.webp",
  "embedding_info": {
    "model": "CLIP ViT-B/32",
    "dimension": 512,
    "pinecone_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Response (Error - 400/500):**

```json
{
  "detail": "File too large. Max size: 100 MB"
}
```

---

## Batch Operations

### 2. Upload Multiple Files (Batch/Folder Upload)

**Endpoint:** `POST /upload/batch`

**Description:** Upload and process multiple files simultaneously with parallel processing. Ideal for folder uploads.

**Request:**

```http
POST /upload/batch
Content-Type: multipart/form-data

Parameters:
- files: File[] (required) - Multiple files to upload
- batch_name: String (optional) - Name for this batch
- user_id: String (optional) - User identifier
- compress: Boolean (optional, default: true)
- generate_embeddings: Boolean (optional, default: true)
- max_concurrent: Integer (optional, default: 5, range: 1-10) - Max parallel processing
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/upload/batch" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "files=@document.pdf" \
  -F "files=@script.py" \
  -F "batch_name=My Project Files" \
  -F "user_id=user123" \
  -F "compress=true" \
  -F "generate_embeddings=true" \
  -F "max_concurrent=5"
```

**JavaScript/Fetch Example:**

```javascript
async function uploadBatch(files, batchName = 'Untitled Batch', maxConcurrent = 5) {
  const formData = new FormData();
  
  // Append all files
  files.forEach(file => {
    formData.append('files', file);
  });
  
  formData.append('batch_name', batchName);
  formData.append('compress', 'true');
  formData.append('generate_embeddings', 'true');
  formData.append('max_concurrent', maxConcurrent.toString());

  const response = await fetch(`${API_BASE}/upload/batch`, {
    method: 'POST',
    body: formData
  });

  return await response.json();
}

// Usage with multiple file input
document.getElementById('batchInput').addEventListener('change', async (e) => {
  const files = Array.from(e.target.files);
  const result = await uploadBatch(files, 'My Folder Upload');
  console.log(`Uploaded ${result.successful}/${result.total_files} files`);
});

// With drag and drop
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer.files);
  const result = await uploadBatch(files);
});
```

**Response (Success - 201 Created):**

```json
{
  "message": "Batch upload completed",
  "batch_id": "abc-123-def-456",
  "batch_name": "My Project Files",
  "total_files": 5,
  "successful": 4,
  "failed": 1,
  "progress_percentage": 100.0,
  "status": "completed",
  "files": [
    {
      "filename": "photo1.jpg",
      "status": "success",
      "file_id": "file-001",
      "pipeline": "media",
      "pipeline_description": "Media Pipeline - Images, Videos, Audio",
      "compression_ratio": 45.2
    },
    {
      "filename": "photo2.jpg",
      "status": "success",
      "file_id": "file-002",
      "pipeline": "media",
      "compression_ratio": 52.1
    },
    {
      "filename": "document.pdf",
      "status": "success",
      "file_id": "file-003",
      "pipeline": "document",
      "pipeline_description": "Document Pipeline - PDF, TXT, DOCX"
    },
    {
      "filename": "script.py",
      "status": "success",
      "file_id": "file-004",
      "pipeline": "code",
      "pipeline_description": "Code Pipeline - Source Code Files"
    },
    {
      "filename": "corrupted.dat",
      "status": "failed",
      "error": "File processing failed: Invalid format"
    }
  ]
}
```

---

### 3. Get Batch Status

**Endpoint:** `GET /batch/{batch_id}`

**Description:** Get the status and progress of a batch upload.

**Request:**

```http
GET /batch/{batch_id}
```

**cURL Example:**

```bash
curl "http://localhost:8000/batch/abc-123-def-456"
```

**JavaScript/Fetch Example:**

```javascript
async function getBatchStatus(batchId) {
  const response = await fetch(`${API_BASE}/batch/${batchId}`);
  return await response.json();
}

// Poll for progress
async function pollBatchProgress(batchId) {
  const interval = setInterval(async () => {
    const status = await getBatchStatus(batchId);
    console.log(`Progress: ${status.progress_percentage}%`);
    
    if (status.status === 'completed') {
      clearInterval(interval);
      console.log('Batch complete!');
    }
  }, 2000); // Check every 2 seconds
}
```

**Response (Success - 200 OK):**

```json
{
  "batch_id": "abc-123-def-456",
  "batch_name": "My Project Files",
  "user_id": "user123",
  "total_files": 10,
  "processed_files": 10,
  "successful_files": 9,
  "failed_files": 1,
  "status": "completed",
  "progress_percentage": 100.0,
  "files": [
    {
      "file_id": "file-001",
      "filename": "photo.jpg",
      "pipeline": "media",
      "status": "success"
    }
    // ... more files
  ],
  "errors": [
    {
      "filename": "corrupted.dat",
      "error": "Invalid format"
    }
  ],
  "created_at": "2025-11-12T10:00:00Z",
  "updated_at": "2025-11-12T10:05:00Z",
  "completed_at": "2025-11-12T10:05:00Z"
}
```

**Response (Error - 404 Not Found):**

```json
{
  "detail": "Batch not found: abc-123-def-456"
}
```

---

### 4. Get Batch Files

**Endpoint:** `GET /batch/{batch_id}/files`

**Description:** Get all files in a specific batch with full metadata.

**Request:**

```http
GET /batch/{batch_id}/files?limit=100

Query Parameters:
- limit: Integer (optional, default: 100, range: 1-1000) - Max files to return
```

**cURL Example:**

```bash
curl "http://localhost:8000/batch/abc-123-def-456/files?limit=50"
```

**JavaScript/Fetch Example:**

```javascript
async function getBatchFiles(batchId, limit = 100) {
  const response = await fetch(
    `${API_BASE}/batch/${batchId}/files?limit=${limit}`
  );
  return await response.json();
}
```

**Response (Success - 200 OK):**

```json
{
  "batch_id": "abc-123-def-456",
  "count": 10,
  "files": [
    {
      "file_id": "file-001",
      "filename": "photo.jpg",
      "file_type": "image",
      "file_size": 2048576,
      "mime_type": "image/jpeg",
      "s3_url": "https://...",
      "metadata": {
        "dimensions": {
          "width": 1920,
          "height": 1080
        }
      },
      "created_at": "2025-11-12T10:00:00Z"
    }
    // ... more files
  ]
}
```

---

### 5. List All Batches

**Endpoint:** `GET /batches`

**Description:** List all batches with pagination and optional user filtering.

**Request:**

```http
GET /batches?user_id=user123&limit=50&skip=0

Query Parameters:
- user_id: String (optional) - Filter by user ID
- limit: Integer (optional, default: 50, range: 1-100) - Max batches to return
- skip: Integer (optional, default: 0) - Number to skip for pagination
```

**cURL Example:**

```bash
curl "http://localhost:8000/batches?limit=20&skip=0"
```

**JavaScript/Fetch Example:**

```javascript
async function listBatches(userId = null, page = 0, pageSize = 20) {
  const params = new URLSearchParams({
    limit: pageSize.toString(),
    skip: (page * pageSize).toString()
  });
  
  if (userId) {
    params.append('user_id', userId);
  }

  const response = await fetch(`${API_BASE}/batches?${params}`);
  return await response.json();
}

// Usage
const batches = await listBatches('user123', 0, 20); // First page
```

**Response (Success - 200 OK):**

```json
{
  "count": 20,
  "limit": 50,
  "skip": 0,
  "batches": [
    {
      "batch_id": "abc-123",
      "batch_name": "Recent Upload",
      "user_id": "user123",
      "total_files": 15,
      "processed_files": 15,
      "successful_files": 14,
      "failed_files": 1,
      "status": "completed",
      "progress_percentage": 100.0,
      "created_at": "2025-11-12T10:00:00Z",
      "completed_at": "2025-11-12T10:05:00Z"
    }
    // ... more batches
  ]
}
```

---

### 6. Delete Batch

**Endpoint:** `DELETE /batch/{batch_id}`

**Description:** Delete an entire batch and all its files from all storage backends (S3, MongoDB, Pinecone).

**Request:**

```http
DELETE /batch/{batch_id}
```

**cURL Example:**

```bash
curl -X DELETE "http://localhost:8000/batch/abc-123-def-456"
```

**JavaScript/Fetch Example:**

```javascript
async function deleteBatch(batchId) {
  const response = await fetch(`${API_BASE}/batch/${batchId}`, {
    method: 'DELETE'
  });
  return await response.json();
}

// With confirmation
async function deleteBatchWithConfirm(batchId, batchName) {
  if (confirm(`Delete batch "${batchName}" and all its files?`)) {
    const result = await deleteBatch(batchId);
    console.log(`Deleted ${result.deleted_files} files`);
  }
}
```

**Response (Success - 200 OK):**

```json
{
  "message": "Batch and all files deleted successfully",
  "batch_id": "abc-123-def-456",
  "deleted_files": 14,
  "failed_deletions": 1,
  "total_files": 15
}
```

---

## File Retrieval

Once files are uploaded, you need to retrieve them. The system provides multiple ways to access your files:

### 🎯 Retrieval Methods

1. **Get File Metadata** - `GET /media/{file_id}` - Get complete file information
2. **Download File** - `GET /media/{file_id}/download` - Download the actual file
3. **Get Direct URL** - `GET /media/{file_id}/url` - Get presigned S3 URL for direct access
4. **Get Thumbnail** - `GET /media/{file_id}/thumbnail` - Get preview/thumbnail
5. **List All Files** - `GET /media` - Browse all uploaded files

### 📖 Quick Examples

**Display an image:**
```javascript
// Get direct URL and display
const urlData = await fetch(`${API_BASE}/media/${fileId}/url`).then(r => r.json());
document.getElementById('myImage').src = urlData.url;
```

**Download a file:**
```javascript
// Trigger download
window.location.href = `${API_BASE}/media/${fileId}/download`;
```

**Show thumbnails in a gallery:**
```javascript
files.forEach(file => {
  const img = document.createElement('img');
  img.src = `${API_BASE}/media/${file.file_id}/thumbnail?size=300`;
  gallery.appendChild(img);
});
```

### 🔐 Security Notes

- **Direct URLs** (`/url` endpoint): Generate temporary presigned URLs that expire
- **Downloads** (`/download` endpoint): Redirect to S3, no server bandwidth used  
- **Thumbnails** (`/thumbnail` endpoint): Optimized previews for fast loading

For complete endpoint details, see [File Management](#file-management) section below.

---

## Search Operations

### 7. Search by Text

**Endpoint:** `POST /search/text` or `GET /search/text`

**Description:** Semantic search across all file types using text query. Uses embeddings to find relevant files.

**Request:**

```http
GET /search/text?query=beautiful+sunset&top_k=10

Query Parameters:
- query: String (required) - Text search query
- top_k: Integer (optional, default: 10, range: 1-100) - Number of results
```

**cURL Example:**

```bash
curl "http://localhost:8000/search/text?query=python%20function&top_k=20"
```

**JavaScript/Fetch Example:**

```javascript
async function searchByText(query, topK = 10) {
  const params = new URLSearchParams({
    query: query,
    top_k: topK.toString()
  });

  const response = await fetch(`${API_BASE}/search/text?${params}`);
  return await response.json();
}

// Usage
const results = await searchByText('beautiful sunset', 10);
results.results.forEach(item => {
  console.log(`${item.filename}: ${item.similarity_score}`);
});
```

**Response (Success - 200 OK):**

```json
{
  "query": "beautiful sunset",
  "query_type": "text",
  "results_count": 10,
  "results": [
    {
      "file_id": "file-001",
      "filename": "sunset_beach.jpg",
      "file_type": "image",
      "similarity_score": 0.92,
      "s3_url": "https://...",
      "metadata": {
        "dimensions": {
          "width": 1920,
          "height": 1080
        }
      },
      "created_at": "2025-11-12T10:00:00Z"
    },
    {
      "file_id": "file-002",
      "filename": "ocean_view.jpg",
      "file_type": "image",
      "similarity_score": 0.87,
      "s3_url": "https://...",
      "created_at": "2025-11-12T09:00:00Z"
    }
    // ... more results
  ]
}
```

---

### 8. Search by Image

**Endpoint:** `POST /search/image`

**Description:** Find similar images using visual similarity (CLIP embeddings).

**Request:**

```http
POST /search/image
Content-Type: multipart/form-data

Parameters:
- file: File (required) - Query image
- top_k: Integer (optional, default: 10, range: 1-100) - Number of results
```

**cURL Example:**

```bash
curl -X POST "http://localhost:8000/search/image" \
  -F "file=@query_image.jpg" \
  -F "top_k=15"
```

**JavaScript/Fetch Example:**

```javascript
async function searchByImage(imageFile, topK = 10) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('top_k', topK.toString());

  const response = await fetch(`${API_BASE}/search/image`, {
    method: 'POST',
    body: formData
  });

  return await response.json();
}

// Usage with file input
document.getElementById('searchImageInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  const results = await searchByImage(file, 20);
  displayResults(results);
});
```

**Response (Success - 200 OK):**

```json
{
  "query_type": "image",
  "results_count": 10,
  "results": [
    {
      "file_id": "file-003",
      "filename": "similar_photo.jpg",
      "file_type": "image",
      "similarity_score": 0.95,
      "s3_url": "https://...",
      "metadata": {
        "dimensions": {
          "width": 1920,
          "height": 1080
        }
      }
    }
    // ... more results
  ]
}
```

---

## File Management

### 9. Get File Metadata

**Endpoint:** `GET /media/{file_id}`

**Description:** Get complete information about a specific file.

**Request:**

```http
GET /media/{file_id}
```

**cURL Example:**

```bash
curl "http://localhost:8000/media/550e8400-e29b-41d4-a716-446655440000"
```

**JavaScript/Fetch Example:**

```javascript
async function getFileInfo(fileId) {
  const response = await fetch(`${API_BASE}/media/${fileId}`);
  return await response.json();
}

// Usage
const fileInfo = await getFileInfo('550e8400-e29b-41d4-a716-446655440000');
console.log('File:', fileInfo.filename);
```

**Response (Success - 200 OK):**

```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "photo.jpg",
  "file_type": "image",
  "file_size": 2048576,
  "mime_type": "image/jpeg",
  "s3_url": "https://bucket.supabase.co/storage/v1/object/public/media/...",
  "s3_key": "media/2025/11/550e8400-e29b-41d4-a716-446655440000.webp",
  "metadata": {
    "original_filename": "photo.jpg",
    "dimensions": {
      "width": 1920,
      "height": 1080
    },
    "format": "JPEG",
    "compression_format": "WebP",
    "exif": {
      "camera": "Canon EOS 5D",
      "aperture": "f/2.8",
      "iso": 400
    }
  },
  "embedding_id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2025-11-12T10:30:00Z",
  "updated_at": "2025-11-12T10:30:00Z"
}
```

**Response (Error - 404 Not Found):**

```json
{
  "detail": "File not found: 550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 10. Download File

**Endpoint:** `GET /media/{file_id}/download`

**Description:** Download the actual file content. Returns the original or processed file from storage.

**Request:**

```http
GET /media/{file_id}/download
```

**cURL Example:**

```bash
# Download file
curl -O -J "http://localhost:8000/media/550e8400-e29b-41d4-a716-446655440000/download"

# Or save with specific name
curl "http://localhost:8000/media/550e8400-e29b-41d4-a716-446655440000/download" \
  -o my_file.jpg
```

**JavaScript/Fetch Example:**

```javascript
async function downloadFile(fileId, filename) {
  const response = await fetch(`${API_BASE}/media/${fileId}/download`);
  const blob = await response.blob();
  
  // Create download link
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

// Usage
downloadFile('550e8400-e29b-41d4-a716-446655440000', 'photo.jpg');
```

**React Download Button:**

```javascript
function DownloadButton({ fileId, filename }) {
  const handleDownload = async () => {
    try {
      const response = await fetch(
        `http://localhost:8000/media/${fileId}/download`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <button onClick={handleDownload}>
      Download {filename}
    </button>
  );
}
```

**Response:**

Redirects to the S3 storage URL or streams the file content.

---

### 11. Get Direct File URL

**Endpoint:** `GET /media/{file_id}/url`

**Description:** Get a direct presigned URL for accessing the file from S3 storage. This is useful when you want to display images/videos directly in HTML or share temporary download links.

**Request:**

```http
GET /media/{file_id}/url?expires_in=3600

Query Parameters:
- expires_in: Integer (optional, default: 3600, range: 300-86400) - URL expiration in seconds
```

**cURL Example:**

```bash
# Get URL that expires in 1 hour (3600 seconds)
curl "http://localhost:8000/media/550e8400-e29b-41d4-a716-446655440000/url?expires_in=3600"

# Get URL that expires in 24 hours
curl "http://localhost:8000/media/550e8400-e29b-41d4-a716-446655440000/url?expires_in=86400"
```

**JavaScript/Fetch Example:**

```javascript
async function getFileUrl(fileId, expiresIn = 3600) {
  const response = await fetch(
    `${API_BASE}/media/${fileId}/url?expires_in=${expiresIn}`
  );
  return await response.json();
}

// Usage - Display image
const urlData = await getFileUrl('550e8400-e29b-41d4-a716-446655440000');
document.getElementById('myImage').src = urlData.url;

// Usage - Create shareable link
const shareableUrl = await getFileUrl(fileId, 86400); // 24 hour expiry
navigator.clipboard.writeText(shareableUrl.url);
```

**Image Gallery Component:**

```javascript
async function ImageGallery({ fileIds }) {
  const [images, setImages] = useState([]);

  useEffect(() => {
    async function loadImages() {
      const urls = await Promise.all(
        fileIds.map(id => getFileUrl(id))
      );
      setImages(urls);
    }
    loadImages();
  }, [fileIds]);

  return (
    <div className="gallery">
      {images.map((img, i) => (
        <img key={i} src={img.url} alt={`Image ${i}`} />
      ))}
    </div>
  );
}
```

**Response (Success - 200 OK):**

```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://bucket.supabase.co/storage/v1/object/sign/media/...",
  "expires_in": 3600,
  "expires_at": "3600 seconds from now"
}
```

**Alternative Response (Permanent URL):**

```json
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "url": "https://bucket.supabase.co/storage/v1/object/public/media/...",
  "expires_in": null,
  "note": "Permanent URL (presigned URLs not available)"
}
```

---

### 12. Get File Thumbnail

**Endpoint:** `GET /media/{file_id}/thumbnail`

**Description:** Get a thumbnail or preview of the file. Useful for displaying image galleries, video previews, or document previews.

**Request:**

```http
GET /media/{file_id}/thumbnail?size=300

Query Parameters:
- size: Integer (optional, default: 300, range: 50-1000) - Thumbnail size in pixels
```

**cURL Example:**

```bash
# Get 300x300 thumbnail
curl "http://localhost:8000/media/550e8400-e29b-41d4-a716-446655440000/thumbnail?size=300"

# Get larger preview
curl "http://localhost:8000/media/550e8400-e29b-41d4-a716-446655440000/thumbnail?size=800"
```

**JavaScript/Fetch Example:**

```javascript
async function getThumbnail(fileId, size = 300) {
  return `${API_BASE}/media/${fileId}/thumbnail?size=${size}`;
}

// Usage - Display thumbnails
document.getElementById('thumb').src = getThumbnail(fileId, 200);
```

**Thumbnail Grid Component:**

```javascript
function ThumbnailGrid({ files }) {
  return (
    <div className="grid">
      {files.map(file => (
        <div key={file.file_id} className="thumbnail">
          <img 
            src={`${API_BASE}/media/${file.file_id}/thumbnail?size=300`}
            alt={file.filename}
            loading="lazy"
          />
          <p>{file.filename}</p>
        </div>
      ))}
    </div>
  );
}
```

**Response:**

Returns thumbnail image or redirects to preview URL.

**Note:** For file types that don't support thumbnails (e.g., code, generic files), returns a 501 error.

---

### 13. Delete File

**Endpoint:** `DELETE /media/{file_id}`

**Description:** Delete a file from all storage backends (S3, MongoDB, Pinecone).

**Request:**

```http
DELETE /media/{file_id}
```

**cURL Example:**

```bash
curl -X DELETE "http://localhost:8000/media/550e8400-e29b-41d4-a716-446655440000"
```

**JavaScript/Fetch Example:**

```javascript
async function deleteFile(fileId) {
  const response = await fetch(`${API_BASE}/media/${fileId}`, {
    method: 'DELETE'
  });
  return await response.json();
}

// With confirmation
async function deleteFileWithConfirm(fileId, filename) {
  if (confirm(`Delete "${filename}"?`)) {
    const result = await deleteFile(fileId);
    console.log('Deleted:', result);
  }
}
```

**Response (Success - 200 OK):**

```json
{
  "message": "File deleted successfully",
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted_from": {
    "s3": true,
    "mongodb": true,
    "pinecone": true
  }
}
```

---

### 14. List All Files

**Endpoint:** `GET /media`

**Description:** List all files with pagination and optional filtering.

**Request:**

```http
GET /media?limit=50&skip=0&file_type=image

Query Parameters:
- limit: Integer (optional, default: 50, range: 1-500) - Max files to return
- skip: Integer (optional, default: 0) - Number to skip for pagination
- file_type: String (optional) - Filter by file type (image, video, audio, document, code, etc.)
```

**cURL Example:**

```bash
curl "http://localhost:8000/media?limit=20&file_type=image"
```

**JavaScript/Fetch Example:**

```javascript
async function listFiles(page = 0, pageSize = 50, fileType = null) {
  const params = new URLSearchParams({
    limit: pageSize.toString(),
    skip: (page * pageSize).toString()
  });
  
  if (fileType) {
    params.append('file_type', fileType);
  }

  const response = await fetch(`${API_BASE}/media?${params}`);
  return await response.json();
}

// Usage with pagination
let currentPage = 0;
async function loadNextPage() {
  const data = await listFiles(currentPage, 20, 'image');
  displayFiles(data.files);
  currentPage++;
}

// Infinite scroll
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
    loadNextPage();
  }
});
```

**Response (Success - 200 OK):**

```json
{
  "count": 50,
  "limit": 50,
  "skip": 0,
  "total": 250,
  "files": [
    {
      "file_id": "file-001",
      "filename": "photo.jpg",
      "file_type": "image",
      "file_size": 2048576,
      "s3_url": "https://...",
      "created_at": "2025-11-12T10:00:00Z"
    }
    // ... more files
  ]
}
```

---

## System Information

### 15. Get Available Pipelines

**Endpoint:** `GET /pipelines`

**Description:** Get information about all available processing pipelines.

**Request:**

```http
GET /pipelines
```

**cURL Example:**

```bash
curl "http://localhost:8000/pipelines"
```

**JavaScript/Fetch Example:**

```javascript
async function getPipelines() {
  const response = await fetch(`${API_BASE}/pipelines`);
  return await response.json();
}

// Display supported file types
const pipelines = await getPipelines();
pipelines.pipelines.forEach(pipeline => {
  console.log(`${pipeline.name}: ${pipeline.supported_extensions.join(', ')}`);
});
```

**Response (Success - 200 OK):**

```json
{
  "pipelines": [
    {
      "name": "media",
      "description": "Media Pipeline - Images, Videos, Audio",
      "supported_extensions": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".avi", ".mov", ".mp3", ".wav"],
      "features": ["Metadata extraction", "Compression", "CLIP embeddings", "Visual search"]
    },
    {
      "name": "document",
      "description": "Document Pipeline - PDF, TXT, DOCX",
      "supported_extensions": [".pdf", ".txt", ".docx", ".odt", ".rtf"],
      "features": ["Text extraction", "Content chunking", "Embeddings", "Semantic search"]
    },
    {
      "name": "structured_data",
      "description": "Structured Data Pipeline - JSON, CSV, XML",
      "supported_extensions": [".json", ".csv", ".xml", ".yaml", ".tsv"],
      "features": ["Schema inference", "SQL/NoSQL routing", "Query support"]
    },
    {
      "name": "code",
      "description": "Code Pipeline - Source Code Files",
      "supported_extensions": [".py", ".js", ".java", ".cpp", ".go", ".rs", ".ts", ".jsx", ".tsx"],
      "features": ["Code parsing", "AST analysis", "CodeBERT embeddings", "Code search"]
    },
    {
      "name": "generic",
      "description": "Generic Pipeline - All Other File Types",
      "supported_extensions": ["*"],
      "features": ["MIME detection", "SHA-256 hashing", "Deduplication", "Basic metadata"]
    }
  ]
}
```

---

### 16. Get System Stats

**Endpoint:** `GET /stats`

**Description:** Get system-wide statistics.

**Request:**

```http
GET /stats
```

**cURL Example:**

```bash
curl "http://localhost:8000/stats"
```

**JavaScript/Fetch Example:**

```javascript
async function getStats() {
  const response = await fetch(`${API_BASE}/stats`);
  return await response.json();
}

// Display stats dashboard
const stats = await getStats();
console.log(`Total Files: ${stats.total_files}`);
console.log(`Storage Used: ${(stats.total_storage_bytes / 1e9).toFixed(2)} GB`);
```

**Response (Success - 200 OK):**

```json
{
  "total_files": 1523,
  "total_storage_bytes": 5368709120,
  "total_storage_gb": 5.0,
  "files_by_type": {
    "image": 856,
    "video": 123,
    "audio": 89,
    "document": 245,
    "code": 178,
    "generic": 32
  },
  "total_embeddings": 1491,
  "avg_file_size_bytes": 3524096,
  "compression_stats": {
    "total_original_size": 8589934592,
    "total_compressed_size": 5368709120,
    "avg_compression_ratio": 62.5
  }
}
```

---

### 17. Health Check

**Endpoint:** `GET /health`

**Description:** Check if the API is running.

**Request:**

```http
GET /health
```

**cURL Example:**

```bash
curl "http://localhost:8000/health"
```

**JavaScript/Fetch Example:**

```javascript
async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    return false;
  }
}

// Check before making requests
if (await checkHealth()) {
  console.log('API is ready');
} else {
  console.error('API is down');
}
```

**Response (Success - 200 OK):**

```json
{
  "status": "healthy"
}
```

---

### 18. API Root

**Endpoint:** `GET /`

**Description:** Get API information and available endpoints.

**Request:**

```http
GET /
```

**Response (Success - 200 OK):**

```json
{
  "service": "Intelligent Multi-Modal Storage System",
  "version": "1.0.0",
  "status": "running",
  "description": "Adaptive file processing with intelligent pipeline routing",
  "supported_pipelines": [
    "Media (images/videos/audio)",
    "Documents (PDF/TXT/DOCX)",
    "Structured Data (JSON/CSV/XML)",
    "Code (PY/JAVA/JS/CPP/etc)",
    "Generic (all other file types)"
  ],
  "endpoints": {
    "upload": "POST /upload",
    "batch_upload": "POST /upload/batch",
    "search": "POST /search/text, POST /search/image",
    "get_file": "GET /media/{file_id}",
    "delete_file": "DELETE /media/{file_id}",
    "list_files": "GET /media",
    "get_batch": "GET /batch/{batch_id}",
    "get_batch_files": "GET /batch/{batch_id}/files",
    "delete_batch": "DELETE /batch/{batch_id}",
    "list_batches": "GET /batches",
    "pipelines": "GET /pipelines",
    "stats": "GET /stats",
    "health": "GET /health",
    "docs": "GET /docs"
  },
  "features": [
    "Intelligent file type detection",
    "Parallel batch processing",
    "Multi-modal embeddings (CLIP, SentenceTransformers, CodeBERT)",
    "Adaptive compression",
    "Semantic search across all file types",
    "Progress tracking for batch uploads",
    "Deduplication via SHA-256 hashing"
  ]
}
```

---

## Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | File retrieved successfully |
| 201 | Created | File uploaded successfully |
| 400 | Bad Request | Invalid parameters, file too large |
| 404 | Not Found | File or batch not found |
| 500 | Server Error | Processing failed, storage error |

### Error Handling in JavaScript

```javascript
async function safeApiCall(apiFunction) {
  try {
    const result = await apiFunction();
    return { success: true, data: result };
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: error.message };
  }
}

// Usage
const result = await safeApiCall(() => uploadFile(file));
if (result.success) {
  console.log('Upload successful:', result.data);
} else {
  alert('Upload failed: ' + result.error);
}
```

---

## Frontend Examples

### Complete Upload Component (React)

```javascript
import React, { useState } from 'react';

const API_BASE = 'http://localhost:8000';

function FileUploader() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const uploadBatch = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    
    files.forEach(file => formData.append('files', file));
    formData.append('batch_name', 'React Upload');
    formData.append('max_concurrent', '5');

    try {
      const response = await fetch(`${API_BASE}/upload/batch`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      setProgress(result);
      alert(`Uploaded ${result.successful}/${result.total_files} files!`);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        disabled={uploading}
      />
      
      <button onClick={uploadBatch} disabled={uploading || files.length === 0}>
        {uploading ? 'Uploading...' : `Upload ${files.length} files`}
      </button>

      {progress && (
        <div>
          <h3>Upload Complete</h3>
          <p>Batch ID: {progress.batch_id}</p>
          <p>Successful: {progress.successful}/{progress.total_files}</p>
          
          <ul>
            {progress.files.map((file, i) => (
              <li key={i}>
                {file.filename} - {file.status}
                {file.pipeline && ` (${file.pipeline})`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FileUploader;
```

### Search Component (Vue)

```vue
<template>
  <div>
    <input
      v-model="searchQuery"
      @keyup.enter="search"
      placeholder="Search files..."
    />
    <button @click="search">Search</button>

    <div v-if="results.length">
      <h3>Results ({{ results.length }})</h3>
      <div v-for="result in results" :key="result.file_id" class="result">
        <img v-if="result.file_type === 'image'" :src="result.s3_url" />
        <p>{{ result.filename }}</p>
        <p>Score: {{ result.similarity_score.toFixed(2) }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      searchQuery: '',
      results: []
    };
  },
  methods: {
    async search() {
      const params = new URLSearchParams({
        query: this.searchQuery,
        top_k: '20'
      });

      const response = await fetch(
        `http://localhost:8000/search/text?${params}`
      );
      const data = await response.json();
      this.results = data.results;
    }
  }
};
</script>
```

### Drag & Drop (Vanilla JS)

```html
<div id="dropZone" style="border: 2px dashed #ccc; padding: 50px; text-align: center;">
  Drop files here
</div>
<div id="status"></div>

<script>
const dropZone = document.getElementById('dropZone');
const status = document.getElementById('status');

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.background = '#f0f0f0';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.background = 'white';
});

dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dropZone.style.background = 'white';
  
  const files = Array.from(e.dataTransfer.files);
  status.textContent = `Uploading ${files.length} files...`;
  
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('batch_name', 'Drag & Drop Upload');
  
  try {
    const response = await fetch('http://localhost:8000/upload/batch', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    status.textContent = `✅ Uploaded ${result.successful}/${result.total_files} files!`;
  } catch (error) {
    status.textContent = `❌ Upload failed: ${error.message}`;
  }
});
</script>
```

---

## Interactive API Documentation

**Swagger UI:** `http://localhost:8000/docs`

The API includes interactive Swagger documentation where you can:
- Test all endpoints directly from the browser
- See request/response schemas
- Try different parameters
- View example responses

**ReDoc:** `http://localhost:8000/redoc`

Alternative documentation interface with a cleaner design.

---

## Rate Limiting & Best Practices

### Best Practices

1. **File Size Limits**
   - Max single file: 100 MB (configurable)
   - Batch upload: Check individual file sizes

2. **Concurrency**
   - Recommended `max_concurrent`: 3-5 for best performance
   - Adjust based on server capacity and file sizes

3. **Polling**
   - Poll batch status every 2-5 seconds
   - Use exponential backoff for long-running batches

4. **Error Handling**
   - Always wrap API calls in try-catch
   - Display user-friendly error messages
   - Implement retry logic for network errors

5. **File Types**
   - The system accepts ANY file type
   - No need to validate extensions on frontend
   - Backend handles routing automatically

6. **Progress Tracking**
   - Store batch_id after upload
   - Poll for status if processing takes time
   - Show progress percentage to users

---

## Support & Questions

For issues or questions:
- Check the [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) for architecture details
- Review [KEYS_NEEDED.md](KEYS_NEEDED.md) for setup instructions
- See [README.md](README.md) for general information

---

**Last Updated:** 2025-11-12  
**API Version:** 1.0.0

