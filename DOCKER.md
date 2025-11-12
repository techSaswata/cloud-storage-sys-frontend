# Docker Deployment Guide

## Docker Hub Image

The application is available on Docker Hub:
```
techsaswata/onedrive-clone:latest
```

## Quick Start - Using Docker Hub Image

Pull and run the latest image from Docker Hub:

```bash
docker pull techsaswata/onedrive-clone:latest
docker run -p 3000:3000 techsaswata/onedrive-clone:latest
```

Access the application at: http://localhost:3000

## Local Development with Docker Compose

### Prerequisites

Install Docker Desktop:
```bash
brew install --cask docker
```

### Commands

**Build and start the application** (shows logs in terminal):
```bash
docker-compose up
```

**Build and start in background**:
```bash
docker-compose up -d
```

**Stop and remove containers**:
```bash
docker-compose down
```

**Rebuild the image**:
```bash
docker-compose build
```

**View logs**:
```bash
docker-compose logs -f
```

## Building and Pushing to Docker Hub

If you need to build and push a new version:

```bash
# Build the image
docker-compose build

# Tag for Docker Hub
docker tag onedrive-clone-onedrive-clone:latest techsaswata/onedrive-clone:latest

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push techsaswata/onedrive-clone:latest
```

## Docker Configuration

- **Dockerfile**: Multi-stage build for optimized production image
- **Port**: 3000 (maps host:3000 -> container:3000)
- **Base Image**: node:20-alpine
- **Final Image Size**: ~329MB
- **Security**: Runs as non-root user (nextjs:nodejs)
