# OneDrive Clone - Cloud Storage System

A modern cloud storage application built with Next.js, TypeScript, and Tailwind CSS. **Now fully integrated with backend API!** 🎉

## ⚡ Quick Start

### Prerequisites
- Backend server running at `http://localhost:8000`
- Node.js 18+
- npm or yarn

### Start the App (2 Steps)

1. **Install dependencies:**
```bash
npm install
```

2. **Run development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🎯 Features

- ✅ **Real-time file sync** - Auto-refreshes every 2 seconds
- ✅ **All file types** - Images, videos, documents, code, etc.
- ✅ **Smart thumbnails** - Fast-loading image previews
- ✅ **Multi-modal search** - Text and image search (backend ready)
- ✅ **Cloud storage** - Files stored in S3 with MongoDB metadata
- ✅ **Vector embeddings** - Powered by Pinecone for semantic search

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **[START_HERE.md](START_HERE.md)** | 👈 Start here for setup guide |
| **[QUICKSTART.md](QUICKSTART.md)** | Quick 3-step startup |
| **[INTEGRATION.md](INTEGRATION.md)** | Complete technical documentation |
| **[API.md](API.md)** | Backend API reference |
| **[RETRIEVAL_GUIDE.md](RETRIEVAL_GUIDE.md)** | File retrieval examples |

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Context** - Global state management
- **ESLint** - Code linting

### Backend (Integrated)
- **FastAPI** - Python backend API
- **S3 (Supabase)** - File storage
- **MongoDB** - Metadata storage
- **Pinecone** - Vector embeddings
- **CLIP** - Image embeddings
- **Multi-modal pipelines** - Intelligent file processing

## 📁 Project Structure

```
cloud-storage-sys-frontend/
├── app/                    # Next.js App Router pages
│   ├── gallery/           # Photo gallery page
│   ├── myfiles/           # File browser page
│   ├── favorites/         # Favorites page
│   └── layout.tsx         # Root layout with providers
├── components/            # React components
│   ├── PhotosView.tsx    # Gallery view (backend integrated)
│   └── MyFilesView.tsx   # File list (backend integrated)
├── contexts/              # React contexts
│   └── FilesContext.tsx  # Global state + auto-polling
├── lib/                   # Utilities
│   ├── apiService.ts     # Backend API interface
│   └── useFileUpload.ts  # Upload hook
├── public/                # Static assets
└── Documentation/
    ├── START_HERE.md      # Setup guide
    ├── INTEGRATION.md     # Technical docs
    └── QUICKSTART.md      # Quick reference
```

## 🔄 Architecture

```
Frontend (Next.js) ←→ Backend API (FastAPI) ←→ Storage (S3/MongoDB/Pinecone)
     ↓                        ↓                         ↓
Auto-refresh         File Processing           Cloud Storage
every 2 secs         + Embeddings              + Metadata
```

## 🎨 Pages

- **`/gallery`** - Photo and video gallery with thumbnails
- **`/myfiles`** - Browse all uploaded files
- **`/favorites`** - Favorite files
- **`/albums`** - Photo albums

## 🧪 Testing

1. Start backend: `http://localhost:8000`
2. Start frontend: `npm run dev`
3. Upload a file via UI
4. Watch it appear automatically!

## 🐳 Docker (Optional)

```bash
docker-compose up
```

See `DOCKER.md` for details.

