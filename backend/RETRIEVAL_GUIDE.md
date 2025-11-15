# 📥 File Retrieval Guide

**Complete guide for retrieving and displaying uploaded files**

---

## 🎯 Overview

After uploading files to the system, you need to retrieve and display them in your frontend. This guide shows all the ways to access your files.

---

## 🔑 Three Main Retrieval Methods

### 1. **Direct Display (Recommended for Images/Videos)**

Get a direct URL and use it in HTML:

```javascript
// Get URL
const response = await fetch(`http://localhost:8000/media/${fileId}/url?expires_in=3600`);
const data = await response.json();

// Display image
document.getElementById('myImage').src = data.url;

// Display video
document.getElementById('myVideo').src = data.url;
```

**✅ Use when:**
- Displaying images in `<img>` tags
- Playing videos in `<video>` tags
- Playing audio in `<audio>` tags
- Embedding PDFs in `<iframe>`

---

### 2. **Download Files**

Trigger a download to user's computer:

```javascript
// Simple redirect download
window.location.href = `http://localhost:8000/media/${fileId}/download`;

// Or with custom filename
async function downloadFile(fileId, filename) {
  const response = await fetch(`http://localhost:8000/media/${fileId}/download`);
  const blob = await response.blob();
  
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
```

**✅ Use when:**
- User clicks "Download" button
- Exporting data/documents
- Saving files locally

---

### 3. **Thumbnails**

Get optimized previews for galleries:

```javascript
// Direct thumbnail URL
const thumbnailUrl = `http://localhost:8000/media/${fileId}/thumbnail?size=300`;

// In HTML
<img src={thumbnailUrl} loading="lazy" />
```

**✅ Use when:**
- Building image galleries
- Showing video previews
- Document previews
- Fast-loading thumbnails

---

## 📱 Complete Frontend Examples

### React Image Gallery

```jsx
import React, { useState, useEffect } from 'react';

function ImageGallery({ fileIds }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadImages() {
      try {
        const urls = await Promise.all(
          fileIds.map(async (id) => {
            const res = await fetch(`http://localhost:8000/media/${id}/url`);
            const data = await res.json();
            return { id, url: data.url };
          })
        );
        setImages(urls);
      } catch (error) {
        console.error('Failed to load images:', error);
      } finally {
        setLoading(false);
      }
    }

    loadImages();
  }, [fileIds]);

  if (loading) return <div>Loading gallery...</div>;

  return (
    <div className="gallery">
      {images.map((img) => (
        <div key={img.id} className="gallery-item">
          <img src={img.url} alt={img.id} />
          <button onClick={() => downloadFile(img.id)}>Download</button>
        </div>
      ))}
    </div>
  );
}

async function downloadFile(fileId) {
  window.location.href = `http://localhost:8000/media/${fileId}/download`;
}

export default ImageGallery;
```

---

### Vue File Browser

```vue
<template>
  <div class="file-browser">
    <div v-for="file in files" :key="file.file_id" class="file-card">
      <!-- Image preview -->
      <img 
        v-if="file.file_type === 'image'"
        :src="`${API_BASE}/media/${file.file_id}/thumbnail?size=200`"
        :alt="file.filename"
      />
      
      <!-- File info -->
      <div class="file-info">
        <h3>{{ file.filename }}</h3>
        <p>{{ formatSize(file.file_size) }}</p>
      </div>

      <!-- Actions -->
      <div class="file-actions">
        <button @click="viewFile(file.file_id)">View</button>
        <button @click="downloadFile(file.file_id)">Download</button>
        <button @click="shareFile(file.file_id)">Share</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      API_BASE: 'http://localhost:8000',
      files: []
    };
  },
  
  async mounted() {
    await this.loadFiles();
  },

  methods: {
    async loadFiles() {
      const response = await fetch(`${this.API_BASE}/media?limit=50`);
      const data = await response.json();
      this.files = data.files;
    },

    async viewFile(fileId) {
      const response = await fetch(`${this.API_BASE}/media/${fileId}/url`);
      const data = await response.json();
      window.open(data.url, '_blank');
    },

    downloadFile(fileId) {
      window.location.href = `${this.API_BASE}/media/${fileId}/download`;
    },

    async shareFile(fileId) {
      const response = await fetch(`${this.API_BASE}/media/${fileId}/url?expires_in=86400`);
      const data = await response.json();
      await navigator.clipboard.writeText(data.url);
      alert('Share link copied! (expires in 24 hours)');
    },

    formatSize(bytes) {
      return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }
  }
};
</script>
```

---

### Vanilla JavaScript Lightbox

```javascript
class FileLightbox {
  constructor(apiBase = 'http://localhost:8000') {
    this.apiBase = apiBase;
    this.createLightbox();
  }

  createLightbox() {
    // Create lightbox HTML
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    lightbox.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 9999;
      justify-content: center;
      align-items: center;
    `;

    lightbox.innerHTML = `
      <button id="close-lightbox" style="position: absolute; top: 20px; right: 20px; 
        background: white; padding: 10px 20px; border: none; cursor: pointer;">
        Close
      </button>
      <img id="lightbox-image" style="max-width: 90%; max-height: 90%;">
      <video id="lightbox-video" controls style="max-width: 90%; max-height: 90%; display: none;"></video>
    `;

    document.body.appendChild(lightbox);

    // Close on click
    document.getElementById('close-lightbox').addEventListener('click', () => {
      this.close();
    });
  }

  async show(fileId) {
    const lightbox = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-image');
    const video = document.getElementById('lightbox-video');

    // Get file info
    const infoRes = await fetch(`${this.apiBase}/media/${fileId}`);
    const info = await infoRes.json();

    // Get URL
    const urlRes = await fetch(`${this.apiBase}/media/${fileId}/url`);
    const urlData = await urlRes.json();

    // Show appropriate element
    if (info.file_type === 'video') {
      img.style.display = 'none';
      video.style.display = 'block';
      video.src = urlData.url;
    } else {
      video.style.display = 'none';
      img.style.display = 'block';
      img.src = urlData.url;
    }

    lightbox.style.display = 'flex';
  }

  close() {
    const lightbox = document.getElementById('lightbox');
    lightbox.style.display = 'none';
    
    // Stop video
    const video = document.getElementById('lightbox-video');
    video.pause();
    video.src = '';
  }
}

// Usage
const lightbox = new FileLightbox();

document.querySelectorAll('.thumbnail').forEach(thumb => {
  thumb.addEventListener('click', () => {
    const fileId = thumb.dataset.fileId;
    lightbox.show(fileId);
  });
});
```

---

## 🚀 Quick Reference

### Get File Metadata
```javascript
const info = await fetch(`/media/${fileId}`).then(r => r.json());
```

### Download File
```javascript
window.location.href = `/media/${fileId}/download`;
```

### Get Direct URL
```javascript
const { url } = await fetch(`/media/${fileId}/url`).then(r => r.json());
```

### Get Thumbnail
```html
<img src="/media/${fileId}/thumbnail?size=300" />
```

### List All Files
```javascript
const { files } = await fetch('/media?limit=50').then(r => r.json());
```

---

## 💡 Best Practices

### 1. **Use Thumbnails for Lists**
```javascript
// ✅ Good - Fast loading
files.map(f => `<img src="/media/${f.file_id}/thumbnail?size=200" />`);

// ❌ Bad - Loads full images
files.map(f => `<img src="/media/${f.file_id}/url" />`);
```

### 2. **Cache URLs**
```javascript
// ✅ Good - Cache for 1 hour
const urlCache = new Map();

async function getFileUrl(fileId) {
  if (urlCache.has(fileId)) {
    return urlCache.get(fileId);
  }
  
  const res = await fetch(`/media/${fileId}/url?expires_in=3600`);
  const data = await res.json();
  urlCache.set(fileId, data.url);
  return data.url;
}
```

### 3. **Lazy Load Images**
```html
<img 
  src="/media/${fileId}/thumbnail?size=300" 
  loading="lazy"
  alt="Image"
/>
```

### 4. **Handle Errors**
```javascript
async function safeGetUrl(fileId) {
  try {
    const res = await fetch(`/media/${fileId}/url`);
    if (!res.ok) throw new Error('File not found');
    return await res.json();
  } catch (error) {
    console.error('Failed to get file URL:', error);
    return { url: '/placeholder.jpg' }; // Fallback
  }
}
```

---

## 📊 URL Expiration Times

| Use Case | Recommended Expiry |
|----------|-------------------|
| Display on page | 1 hour (3600s) |
| Share link | 24 hours (86400s) |
| Temporary preview | 5 minutes (300s) |
| Download link | 1 hour (3600s) |

```javascript
// Examples
await fetch(`/media/${fileId}/url?expires_in=3600`);   // 1 hour
await fetch(`/media/${fileId}/url?expires_in=86400`);  // 24 hours
await fetch(`/media/${fileId}/url?expires_in=300`);    // 5 minutes
```

---

## 🔗 Related Documentation

- **[API.md](API.md)** - Complete API reference
- **[README.md](README.md)** - General system overview
- **[SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)** - Architecture details

---

## ❓ Common Questions

### Q: How do I display an uploaded image?

```javascript
// Method 1: Get URL first (recommended for multiple uses)
const { url } = await fetch(`/media/${fileId}/url`).then(r => r.json());
document.getElementById('img').src = url;

// Method 2: Direct thumbnail (fastest)
document.getElementById('img').src = `/media/${fileId}/thumbnail?size=500`;
```

### Q: How do I create a download button?

```javascript
<button onclick="downloadFile('${fileId}', 'myfile.jpg')">Download</button>

<script>
function downloadFile(fileId, filename) {
  window.location.href = `/media/${fileId}/download`;
}
</script>
```

### Q: How do I build an image gallery?

See the [React Image Gallery](#react-image-gallery) example above.

### Q: Can I access files directly from S3?

Yes! The `/url` endpoint gives you direct S3 URLs. Use them for:
- Displaying in `<img>` tags
- Embedding in `<video>` tags  
- Direct downloads
- Sharing with others (with expiration)

---

**Last Updated:** 2025-11-12

