# 🚀 Quick Start Guide

## 📍 Start the Whole Project

### **Option 1: Run API Server (Recommended)**

```bash
# Activate virtual environment
cd /Users/techsaswata/Downloads/cloud-storage-sys
source venv/bin/activate

# Start the API server
python3 api.py
```

The server will start at: **http://localhost:8000**

**Interactive API docs**: **http://localhost:8000/docs** ← Open this in browser!

---

## 📤 How to Upload Files

### **Method 1: Using the Interactive API Docs (Easiest!)**

1. **Start the server**:
   ```bash
   source venv/bin/activate && python3 api.py
   ```

2. **Open browser**: http://localhost:8000/docs

3. **Click** on `POST /upload` → **Try it out**

4. **Click** "Choose File" and select your image/video

5. **Set parameters**:
   - `compress`: true
   - `generate_embeddings`: true

6. **Click** "Execute"

7. **See response** with file_id and metadata!

---

### **Method 2: Using curl (Command Line)**

```bash
# Upload an image
curl -X POST "http://localhost:8000/upload" \
  -F "file=@/path/to/your/image.jpg" \
  -F "compress=true" \
  -F "generate_embeddings=true"

# Upload a video
curl -X POST "http://localhost:8000/upload" \
  -F "file=@/path/to/your/video.mp4" \
  -F "compress=true" \
  -F "generate_embeddings=true"
```

---

### **Method 3: Using Python Script**

```python
import requests

# Upload file
url = "http://localhost:8000/upload"
files = {'file': open('test.jpg', 'rb')}
data = {
    'compress': 'true',
    'generate_embeddings': 'true'
}

response = requests.post(url, files=files, data=data)
print(response.json())
```

---

### **Method 4: Using JavaScript/Fetch**

```javascript
// Upload from frontend
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('compress', 'true');
formData.append('generate_embeddings', 'true');

fetch('http://localhost:8000/upload', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

---

## 🔍 All API Endpoints

### **Upload & Manage**

```bash
# Upload file
POST http://localhost:8000/upload
Body: multipart/form-data
  - file: <file>
  - compress: true/false
  - generate_embeddings: true/false

# Get all media
GET http://localhost:8000/media?limit=50&skip=0

# Get specific media
GET http://localhost:8000/media/{file_id}

# Delete media
DELETE http://localhost:8000/media/{file_id}
```

### **Search (Uses Pinecone!)**

```bash
# Search by text
POST http://localhost:8000/search/text?query=sunset&top_k=10

# Search by image
POST http://localhost:8000/search/image
Body: multipart/form-data
  - file: <image>
  - top_k: 10
```

### **System**

```bash
# Health check
GET http://localhost:8000/health

# System stats
GET http://localhost:8000/stats
```

---

## 📋 Complete Workflow Example

```bash
# 1. Start the server
source venv/bin/activate
python3 api.py

# 2. In another terminal, upload a file
curl -X POST "http://localhost:8000/upload" \
  -F "file=@test.jpg" \
  -F "compress=true" \
  -F "generate_embeddings=true"

# Response:
# {
#   "message": "File uploaded and processed successfully",
#   "file_id": "abc-123-xyz",
#   "metadata": {...},
#   "s3_url": "https://..."
# }

# 3. Search for it
curl "http://localhost:8000/search/text?query=photo&top_k=5"

# 4. Get file details
curl "http://localhost:8000/media/abc-123-xyz"

# 5. Download (already done in retrieved/)
# Files are in Supabase S3, URLs in response
```

---

## 🎯 Quick Test

```bash
# All in one - complete test
cd /Users/techsaswata/Downloads/cloud-storage-sys
source venv/bin/activate

# Start API in background
python3 api.py &

# Wait a moment for server to start
sleep 3

# Upload test file
curl -X POST "http://localhost:8000/upload" \
  -F "file=@test.jpg" \
  -F "compress=true" \
  -F "generate_embeddings=true"

# Stop the server
kill %1
```

---

## 📊 Response Format

### **Upload Response:**
```json
{
  "message": "File uploaded and processed successfully",
  "file_id": "53569127-204f-46a4-b7b3-77cedaae7042",
  "metadata": {
    "type": "image",
    "format": "JPEG",
    "width": 7920,
    "height": 5280,
    "resolution": "7920x5280",
    "file_size": 11901234
  },
  "compression_stats": {
    "original_size": 11901234,
    "compressed_size": 9811150,
    "compression_ratio": "17.59%"
  },
  "s3_url": "https://oxcrlwmlpcaeqgouounc.storage.supabase.co/storage/v1/s3/..."
}
```

---

## 🌐 Frontend Integration

### **React Example:**

```jsx
import { useState } from 'react';

function Upload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  
  const handleUpload = async () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('compress', 'true');
    formData.append('generate_embeddings', 'true');
    
    const response = await fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    setResult(data);
  };
  
  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => setFile(e.target.files[0])} 
      />
      <button onClick={handleUpload}>Upload</button>
      
      {result && (
        <div>
          <p>File ID: {result.file_id}</p>
          <p>Compression: {result.compression_stats.compression_ratio}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔧 Troubleshooting

### **Port Already in Use:**
```bash
# Kill existing process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
uvicorn api:app --host 0.0.0.0 --port 8001
```

### **Module Not Found:**
```bash
# Make sure you're in virtual environment
source venv/bin/activate

# Reinstall dependencies if needed
pip install -r requirements.txt
```

### **MongoDB/Pinecone Connection Error:**
```bash
# Verify .env file has all credentials
cat .env

# Test connections
python3 setup.py
```

---

## 🎉 You're Ready!

**Main command to remember:**
```bash
cd /Users/techsaswata/Downloads/cloud-storage-sys
source venv/bin/activate
python3 api.py
```

Then open: **http://localhost:8000/docs** 🚀

