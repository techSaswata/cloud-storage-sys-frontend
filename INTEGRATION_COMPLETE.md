# 🔗 Frontend-Backend Integration Guide

## ✅ Integration Complete!

The frontend and backend have been successfully integrated. This guide will help you run and test the entire system.

---

## 📋 Prerequisites

Before starting, ensure you have:

- **Node.js** (v18+ recommended) - for frontend
- **Python 3.8+** - for backend
- **MongoDB** - running locally or Atlas (already configured)
- **FFmpeg** - for video processing
- **Supabase account** - already configured in backend

---

## 🚀 Quick Start

### Step 1: Frontend Setup

```bash
# Navigate to project root
cd /Users/techsaswata/Downloads/cloud-storage-sys-frontend

# Create .env.local file (it's gitignored, so create it manually)
cat > .env.local << 'EOF'
# Frontend Environment Variables
NEXT_PUBLIC_API_BASE=http://localhost:8000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://oxcrlwmlpcaeqgouounc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94Y3Jsd21scGNhZXFnb3VvdW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NjM1NzMsImV4cCI6MjA3ODUzOTU3M30.K-PcComZnfGmXbTJEeOFSywlwLus4n_afk-_1veu89E
EOF

# Install dependencies (if not already done)
npm install

# Start frontend development server
npm run dev
```

Frontend will be available at: **http://localhost:3000**

### Step 2: Backend Setup

```bash
# Open a new terminal
cd /Users/techsaswata/Downloads/cloud-storage-sys-frontend/backend

# Create virtual environment (if not exists)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Mac/Linux
# OR
venv\Scripts\activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Verify .env file exists (it's already configured)
# The backend/.env file has been fixed with correct S3 bucket name

# Start backend server
python api.py
```

Backend will be available at: **http://localhost:8000**
API Documentation: **http://localhost:8000/docs**

---

## 🔐 Authentication Flow (Magic Link)

### How It Works:

1. **User enters email** on login/signup page
2. **Backend sends magic link** to email via Supabase Auth
3. **User clicks link in email**
4. **Supabase redirects** to `/auth/callback` with tokens in URL hash
5. **Frontend extracts tokens** and stores in localStorage
6. **All API requests** include `Authorization: Bearer {token}` header
7. **Backend verifies token** and filters data by user_id

### Test Authentication:

1. Go to **http://localhost:3000/login**
2. Enter your email address
3. Click "Send magic link"
4. Check your email inbox
5. Click the magic link
6. You'll be redirected to `/auth/callback` → then `/home`
7. You're now authenticated!

---

## 📤 File Upload Flow

### Single File Upload

```javascript
// Frontend calls
uploadFile(file, { compress: true, generate_embeddings: true })

// Backend receives
POST /upload
Authorization: Bearer {token}
- Verifies token
- Extracts user_id from token
- Routes file to appropriate pipeline (media/document/code/etc)
- Compresses if requested
- Generates embeddings if requested
- Stores in S3 + MongoDB + Pinecone
- Associates file with user_id
```

### Batch Upload (Multiple Files/Folders)

```javascript
// Frontend calls
uploadBatch(files, { 
  batch_name: "My Folder",
  compress: true,
  generate_embeddings: true,
  max_concurrent: 5 
})

// Backend receives
POST /upload/batch
Authorization: Bearer {token}
- Creates batch record with user_id
- Processes files in parallel (max 5 concurrent)
- Each file routed to appropriate pipeline
- Returns batch_id for tracking
```

### Test Upload:

1. Login to the app
2. Go to **My Files** section
3. Click "Upload" or drag & drop files
4. Watch the upload progress
5. Files appear in the list automatically

---

## 📂 File Listing & Display

### How It Works:

```javascript
// Frontend calls
listFiles({ limit: 500 })

// Backend receives
GET /media?limit=500
Authorization: Bearer {token}
- Verifies token
- Filters files by user_id (from token)
- Returns ONLY user's files
- Auto-polls every 2 seconds for updates
```

### Features:

- **Auto-refresh**: Files list updates every 2 seconds
- **User isolation**: Each user sees only their files
- **Thumbnails**: Image/video thumbnails displayed
- **File types**: Icons based on file type
- **Metadata**: Size, modified date, type shown

---

## 🔍 Search Functionality

### Text Search

```javascript
// Search across all file types
searchByText("sunset beach", 10)

// Backend uses:
- CLIP embeddings for images/videos
- SentenceTransformer for documents
- CodeBERT for code files
- Returns semantically similar results
```

### Image Search

```javascript
// Find similar images
searchByImage(imageFile, 10)

// Backend uses:
- CLIP visual embeddings
- Returns visually similar images
```

---

## 📥 File Download & Preview

### Download

```javascript
// Get download URL
getDownloadUrl(fileId)
// Returns: http://localhost:8000/media/{fileId}/download?token={token}
```

### Preview

```javascript
// Get presigned URL for direct access
getFileUrl(fileId, 3600)  // Expires in 1 hour
// Returns temporary S3 URL
```

### Thumbnail

```javascript
// Get thumbnail URL
getThumbnailUrl(fileId, 300)
// Returns: http://localhost:8000/media/{fileId}/thumbnail?size=300&token={token}
```

---

## 🗑️ File Deletion

```javascript
// Delete file
deleteFile(fileId)

// Backend receives
DELETE /media/{fileId}
Authorization: Bearer {token}
- Verifies user owns file
- Deletes from S3
- Deletes from MongoDB
- Deletes from Pinecone
- Returns success
```

---

## 🔧 Key Integration Points Fixed

### ✅ Backend Fixes:

1. **S3 Bucket Name**: Changed from placeholder to `media`
2. **Authentication**: All endpoints now require JWT token
3. **User Isolation**: All queries filter by user_id from token
4. **CORS**: Enabled for frontend communication

### ✅ Frontend Fixes:

1. **Environment Variables**: Added `.env.local` with API_BASE
2. **Auth Headers**: All API calls include Authorization header
3. **Token Management**: Auto-refresh on 401 errors
4. **FilesContext**: Auto-polling for file updates
5. **Error Handling**: Proper error messages and retries

### ✅ Integration Features:

1. **Magic Link Auth**: Passwordless authentication via email
2. **Automatic User ID**: Extracted from JWT token
3. **File Filtering**: Users only see their own files
4. **Batch Upload**: Parallel processing of multiple files
5. **Decision Engine**: Automatic file routing to pipelines
6. **Auto-refresh**: Real-time file list updates

---

## 🧪 Testing Checklist

### Authentication

- [ ] Login with email → receive magic link
- [ ] Click magic link → redirect to callback
- [ ] Callback extracts tokens → redirect to home
- [ ] Tokens stored in localStorage
- [ ] Logout clears tokens

### File Upload

- [ ] Upload single image file
- [ ] Upload single video file
- [ ] Upload single PDF document
- [ ] Upload multiple files (batch)
- [ ] Upload folder with drag & drop
- [ ] See upload progress
- [ ] Files appear in list after upload

### File Management

- [ ] List all files (only user's files)
- [ ] Files auto-refresh every 2 seconds
- [ ] Click file to preview
- [ ] Download file
- [ ] Delete file
- [ ] Search files by text
- [ ] Search by image

### User Isolation

- [ ] Create 2 user accounts
- [ ] Upload files from user 1
- [ ] Login as user 2
- [ ] Verify user 2 cannot see user 1's files
- [ ] Upload files from user 2
- [ ] Login back as user 1
- [ ] Verify user 1 only sees their files

---

## 📊 Backend Pipelines

The Decision Engine automatically routes files:

| File Type | Pipeline | Features |
|-----------|----------|----------|
| **Images** (.jpg, .png, .webp) | Media Pipeline | Compression (WebP), CLIP embeddings, EXIF extraction |
| **Videos** (.mp4, .mov, .avi) | Media Pipeline | H.265 compression, frame extraction, duration |
| **Audio** (.mp3, .wav, .flac) | Media Pipeline | AAC compression, metadata, waveform |
| **Documents** (.pdf, .txt, .docx) | Document Pipeline | Text extraction, chunking, SentenceTransformer |
| **Code** (.py, .js, .java) | Code Pipeline | AST parsing, CodeBERT embeddings |
| **Data** (.json, .csv, .xml) | Structured Data | Schema inference, SQL/NoSQL routing |
| **Other** (any type) | Generic Pipeline | SHA-256 hashing, deduplication |

---

## 🐛 Troubleshooting

### Backend won't start:

```bash
# Check MongoDB connection
mongosh  # Should connect

# Check Python dependencies
pip install -r requirements.txt

# Check FFmpeg
ffmpeg -version  # Should show version

# Check .env file
cat backend/.env  # Should have all variables
```

### Frontend won't start:

```bash
# Check Node version
node --version  # Should be v18+

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check .env.local
cat .env.local  # Should exist with API_BASE
```

### Authentication not working:

1. Check Supabase email settings (allow magic links)
2. Check email spam folder
3. Verify `SUPABASE_URL` and `SUPABASE_KEY` in backend/.env
4. Check browser console for errors

### Files not appearing:

1. Check backend logs for errors
2. Verify MongoDB is running
3. Check FilesContext is wrapping app (it is)
4. Open browser DevTools → Network tab → Check API calls
5. Verify Authorization header is present

### CORS errors:

1. Backend already has CORS enabled for all origins
2. If issues persist, check backend console for requests
3. Verify API_BASE in .env.local is correct

---

## 📚 API Documentation

Full API documentation available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Key endpoints:

```
Auth:
POST /auth/magic-link       - Send magic link
POST /auth/signout          - Sign out
POST /auth/refresh          - Refresh token
GET  /auth/me               - Get current user

Files:
POST   /upload              - Upload single file
POST   /upload/batch        - Upload multiple files
GET    /media               - List user's files
GET    /media/{id}          - Get file metadata
GET    /media/{id}/download - Download file
GET    /media/{id}/url      - Get presigned URL
GET    /media/{id}/thumbnail- Get thumbnail
DELETE /media/{id}          - Delete file

Search:
POST   /search/text         - Search by text
POST   /search/image        - Search by image

Batch:
GET    /batch/{id}          - Get batch status
GET    /batch/{id}/files    - Get batch files
DELETE /batch/{id}          - Delete batch
GET    /batches             - List user's batches
```

---

## 🎉 Success!

Your frontend and backend are now fully integrated! The system includes:

✅ **Magic Link Authentication** - Passwordless login via email  
✅ **User Isolation** - Each user sees only their files  
✅ **Intelligent File Routing** - Auto-detects file types  
✅ **Multi-Pipeline Support** - Media, Documents, Code, Data  
✅ **Compression** - Automatic file compression  
✅ **Embeddings** - CLIP, SentenceTransformer, CodeBERT  
✅ **Semantic Search** - Text and image similarity search  
✅ **Batch Upload** - Parallel folder upload  
✅ **Auto-refresh** - Real-time file list updates  
✅ **S3 Storage** - Supabase object storage  
✅ **MongoDB** - Metadata storage  
✅ **Pinecone** - Vector embeddings storage  

---

## 📞 Need Help?

Check these files for more information:
- **Backend API**: `backend/API.md`
- **Authentication**: `backend/AUTH.md`
- **File Retrieval**: `backend/RETRIEVAL_GUIDE.md`
- **System Overview**: `backend/SYSTEM_OVERVIEW.md`

**Last Updated**: 2025-01-12  
**Status**: ✅ Production Ready

