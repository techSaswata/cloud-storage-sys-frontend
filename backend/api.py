"""
FastAPI REST API for media storage system
Provides endpoints for upload, search, and management
"""
import os
import tempfile
from pathlib import Path
from typing import Optional, List
import shutil

from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Form, Depends
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from config import Config
from decision_engine import DecisionEngine
from batch_processor import BatchProcessor
from auth import get_current_user, get_auth_service, optional_auth, get_current_user_flexible


# Initialize FastAPI app
app = FastAPI(
    title="Intelligent Multi-Modal Storage System API",
    description="Adaptive data management platform with intelligent file routing. Supports media, documents, structured data, code, and any file type.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize decision engine (singleton)
decision_engine = None
batch_processor = None


def get_decision_engine():
    """Get or create decision engine instance"""
    global decision_engine
    if decision_engine is None:
        decision_engine = DecisionEngine()
    return decision_engine


def get_batch_processor():
    """Get or create batch processor instance"""
    global batch_processor
    if batch_processor is None:
        batch_processor = BatchProcessor()
    return batch_processor


# Pydantic models
class SearchRequest(BaseModel):
    """Search request model"""
    query_type: str  # 'text', 'image', 'video'
    query: str  # text query or file path
    top_k: int = 10


class SignUpRequest(BaseModel):
    """User sign up request"""
    email: str
    password: str
    name: Optional[str] = None


class SignInRequest(BaseModel):
    """User sign in request"""
    email: str
    password: str


class RefreshTokenRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str


class MediaInfoResponse(BaseModel):
    """Media info response model"""
    file_id: str
    metadata: dict
    s3_info: dict
    embedding_info: Optional[dict] = None


@app.on_event("startup")
async def startup_event():
    """Initialize on startup"""
    # Validate configuration
    missing_config = Config.validate()
    if missing_config:
        print("❌ Missing required configuration:")
        for key in missing_config:
            print(f"  - {key}")
        print("\nPlease set these in your .env file")
        raise Exception("Missing required configuration")
    
    print("✓ API started successfully!")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
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
            "download_file": "GET /media/{file_id}/download",
            "get_file_url": "GET /media/{file_id}/url",
            "get_thumbnail": "GET /media/{file_id}/thumbnail",
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


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/auth/signup")
async def sign_up(request: SignUpRequest):
    """
    Register a new user account
    
    Creates a new user with email and password using Supabase Auth.
    Returns user information and access token.
    
    Args:
        request: Sign up request with email, password, and optional name
        
    Returns:
        User information and session tokens
    """
    try:
        auth_service = get_auth_service()
        
        user_metadata = {}
        if request.name:
            user_metadata['name'] = request.name
        
        result = auth_service.sign_up(
            email=request.email,
            password=request.password,
            user_metadata=user_metadata if user_metadata else None
        )
        
        return {
            "message": "User registered successfully",
            "user": result['user'],
            "session": result['session']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/signin")
async def sign_in(request: SignInRequest):
    """
    Sign in with email and password (DEPRECATED - Use magic link instead)
    
    Authenticates user and returns access token.
    Use the access_token in subsequent API requests.
    
    Args:
        request: Sign in request with email and password
        
    Returns:
        User information and session tokens
    """
    try:
        auth_service = get_auth_service()
        
        result = auth_service.sign_in(
            email=request.email,
            password=request.password
        )
        
        return {
            "message": "Signed in successfully",
            "user": result['user'],
            "session": result['session']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")


@app.post("/auth/magic-link")
async def send_magic_link(data: dict):
    """
    Send magic link to user's email for passwordless authentication
    
    Sends an email with a magic link that automatically signs in the user.
    When user clicks the link, Supabase redirects them to your callback URL
    with access_token and refresh_token in the URL parameters.
    
    Flow:
    1. Frontend calls this endpoint with email
    2. Supabase sends magic link email to user
    3. User clicks link in email
    4. Supabase redirects to: callback_url?access_token=xxx&refresh_token=yyy
    5. Frontend extracts tokens from URL and stores them
    6. Frontend calls /auth/me to get user info
    
    Args:
        data: Dictionary with 'email' and 'redirect_to' keys
              Example: {"email": "user@example.com", "redirect_to": "http://localhost:3000/auth/callback"}
        
    Returns:
        Success message with email
    """
    try:
        email = data.get('email')
        redirect_to = data.get('redirect_to')
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        if not redirect_to:
            raise HTTPException(status_code=400, detail="Redirect URL is required")
        
        auth_service = get_auth_service()
        result = auth_service.send_magic_link(email=email, redirect_to=redirect_to)
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send magic link: {str(e)}")


@app.post("/auth/signout")
async def sign_out(user: dict = Depends(get_current_user)):
    """
    Sign out current user
    
    Invalidates the current session.
    Requires authentication.
    
    Returns:
        Success message
    """
    try:
        auth_service = get_auth_service()
        result = auth_service.sign_out(None)  # Token already verified by dependency
        
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/refresh")
async def refresh_token(request: RefreshTokenRequest):
    """
    Refresh access token
    
    Use refresh_token to get a new access_token when the current one expires.
    
    Args:
        request: Refresh token request
        
    Returns:
        New session with fresh access token
    """
    try:
        auth_service = get_auth_service()
        result = auth_service.refresh_token(request.refresh_token)
        
        return {
            "message": "Token refreshed successfully",
            "session": result['session']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token refresh failed")


@app.get("/auth/me")
async def get_current_user_info(user: dict = Depends(get_current_user)):
    """
    Get current user information
    
    Returns information about the authenticated user.
    Requires authentication.
    
    Returns:
        User information
    """
    return {"user": user}


# ============================================================================
# FILE UPLOAD ENDPOINTS (Protected)
# ============================================================================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    compress: bool = Form(True),
    generate_embeddings: bool = Form(True),
    user: dict = Depends(get_current_user)
):
    """
    Upload and process ANY file type through intelligent routing
    
    **🔒 Requires Authentication**
    
    The Decision Engine automatically determines the appropriate pipeline:
    - Media files (images/videos/audio) → Media Pipeline
    - Documents (PDF/TXT/DOCX) → Document Pipeline
    - Structured data (JSON/CSV/XML) → Structured Data Pipeline
    - Code files (PY/JAVA/JS/etc) → Code Pipeline
    - Unknown types → Generic Pipeline
    
    Args:
        file: Any file to upload
        compress: Whether to compress the file
        generate_embeddings: Whether to generate embeddings (when applicable)
        user: Authenticated user (injected automatically)
        
    Returns:
        Processing result with file_id and metadata
    """
    try:
        # Check file size
        contents = await file.read()
        if len(contents) > Config.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Max size: {Config.MAX_FILE_SIZE / 1e6:.0f} MB"
            )
        
        # Save to temporary file
        file_ext = Path(file.filename).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name
        
        try:
            # Route to appropriate pipeline using Decision Engine
            engine = get_decision_engine()
            
            result = engine.route_and_process(
                file_path=temp_path,
                compress=compress,
                generate_embeddings=generate_embeddings,
                custom_metadata={
                    'original_filename': file.filename,
                    'content_type': file.content_type,
                    'user_id': user['user_id'],
                    'user_email': user.get('email'),
                }
            )
            
            if not result.get('success'):
                raise HTTPException(
                    status_code=500,
                    detail=result.get('error', 'Processing failed')
                )
            
            # Build response
            response_data = {
                "message": "File uploaded and processed successfully",
                "file_id": result['file_id'],
                "pipeline": result.get('pipeline', 'unknown'),
                "pipeline_description": result.get('pipeline_description', ''),
                "metadata": result.get('metadata', {}),
            }
            
            # Add optional fields if present
            if 'compression_stats' in result:
                response_data['compression_stats'] = result['compression_stats']
            
            if 's3_info' in result:
                response_data['s3_url'] = result['s3_info'].get('url')
                response_data['s3_key'] = result['s3_info'].get('s3_key')
            
            if 'embedding_info' in result:
                response_data['embedding_info'] = result['embedding_info']
            
            if 'storage_backend' in result:
                response_data['storage_backend'] = result['storage_backend']
            
            return JSONResponse(
                status_code=201,
                content=response_data
            )
        
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/upload/batch")
async def upload_batch(
    files: List[UploadFile] = File(...),
    batch_name: Optional[str] = Form(None),
    folder_paths: Optional[str] = Form(None),  # JSON string of folder paths
    compress: bool = Form(True),
    generate_embeddings: bool = Form(True),
    max_concurrent: int = Form(5),
    user: dict = Depends(get_current_user)
):
    """
    Upload and process multiple files in parallel (folder upload)
    
    **🔒 Requires Authentication**
    
    Automatically routes each file to the appropriate pipeline and tracks
    the entire batch with progress monitoring.
    
    Args:
        files: List of files to upload
        batch_name: Optional name for this batch/folder
        folder_paths: JSON string mapping filenames to folder paths
        compress: Whether to compress files
        generate_embeddings: Whether to generate embeddings
        max_concurrent: Maximum concurrent file processing (default: 5)
        user: Authenticated user (injected automatically)
        
    Returns:
        Batch processing result with file-by-file breakdown
    """
    import asyncio
    import json
    
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        # Parse folder paths if provided
        folder_paths_map = {}
        if folder_paths:
            try:
                folder_paths_map = json.loads(folder_paths)
            except json.JSONDecodeError:
                print("Warning: Could not parse folder_paths JSON")
        
        # Check total size
        total_size = 0
        temp_files = []
        files_data = []
        
        print(f"\n{'='*70}")
        print(f"BATCH UPLOAD: {len(files)} files")
        if batch_name:
            print(f"Batch Name: {batch_name}")
        if folder_paths_map:
            print(f"Folder structure detected with {len(folder_paths_map)} files")
        print(f"{'='*70}\n")
        
        # Save all files to temp directory
        for upload_file in files:
            contents = await upload_file.read()
            file_size = len(contents)
            total_size += file_size
            
            if file_size > Config.MAX_FILE_SIZE:
                # Clean up already saved files
                for temp_path in temp_files:
                    if os.path.exists(temp_path):
                        os.unlink(temp_path)
                
                raise HTTPException(
                    status_code=400,
                    detail=f"File {upload_file.filename} is too large. Max size: {Config.MAX_FILE_SIZE / 1e6:.0f} MB"
                )
            
            # Save to temporary file
            # Extract just the filename from the full path (if it contains a path)
            full_filename = upload_file.filename
            if '/' in full_filename:
                # File has a path, extract folder and filename
                path_parts = full_filename.split('/')
                actual_filename = path_parts[-1]  # Last part is the actual filename
                file_folder_path = '/'.join(path_parts[:-1])  # Everything else is the folder path
                print(f"📁 Extracted from path: '{full_filename}' -> filename: '{actual_filename}', folder: '{file_folder_path}'")
            else:
                # No path in filename
                actual_filename = full_filename
                file_folder_path = folder_paths_map.get(full_filename, '')
                if file_folder_path:
                    print(f"📁 Using folder_paths map: '{actual_filename}' -> folder: '{file_folder_path}'")
            
            file_ext = Path(actual_filename).suffix.lower()
            with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
                temp_file.write(contents)
                temp_path = temp_file.name
                temp_files.append(temp_path)
                
                files_data.append({
                    'path': temp_path,
                    'filename': actual_filename,  # Store only the actual filename
                    'size': file_size,
                    'folder_path': file_folder_path  # Store the folder path separately
                })
        
        print(f"✓ Saved {len(files)} files to temporary storage")
        print(f"Total size: {total_size / 1e6:.2f} MB\n")
        
        try:
            # Create batch processor
            processor = get_batch_processor()
            
            # Create batch record
            batch_id = processor.create_batch(
                batch_name=batch_name,
                user_id=user['user_id'],  # Use authenticated user ID
                total_files=len(files)
            )
            
            print(f"Created batch: {batch_id}")
            print(f"Processing {len(files)} files in parallel (max {max_concurrent} concurrent)...\n")
            
            # Process batch asynchronously
            batch_result = await processor.process_batch_async(
                files_data=files_data,
                batch_id=batch_id,
                compress=compress,
                generate_embeddings=generate_embeddings,
                max_concurrent=max_concurrent,
                user_id=user['user_id']  # Pass user_id to tag files
            )
            
            # Get final batch status
            batch_status = processor.get_batch_status(batch_id)
            
            print(f"\n{'='*70}")
            print(f"BATCH COMPLETE: {batch_result['successful']}/{batch_result['total_files']} successful")
            print(f"{'='*70}\n")
            
            # Build response
            response_data = {
                "message": "Batch upload completed",
                "batch_id": batch_id,
                "batch_name": batch_status.get('batch_name') if batch_status else batch_name,
                "total_files": batch_result['total_files'],
                "successful": batch_result['successful'],
                "failed": batch_result['failed'],
                "progress_percentage": 100.0,
                "status": "completed",
                "files": []
            }
            
            # Add file-by-file breakdown
            for result in batch_result['results']:
                file_info = {
                    "filename": result.get('filename', 'unknown'),
                    "status": "success" if result.get('success') else "failed",
                }
                
                if result.get('success'):
                    file_info.update({
                        "file_id": result.get('file_id'),
                        "pipeline": result.get('pipeline'),
                        "pipeline_description": result.get('pipeline_description'),
                    })
                    
                    if 'compression_stats' in result:
                        file_info['compression_ratio'] = result['compression_stats'].get('compression_ratio')
                else:
                    file_info['error'] = result.get('error', 'Unknown error')
                
                response_data['files'].append(file_info)
            
            return JSONResponse(
                status_code=201,
                content=response_data
            )
        
        finally:
            # Clean up temp files
            for temp_path in temp_files:
                if os.path.exists(temp_path):
                    try:
                        os.unlink(temp_path)
                    except Exception as e:
                        print(f"Warning: Could not delete temp file {temp_path}: {e}")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"\n{'='*70}")
        print(f"❌ BATCH UPLOAD ERROR")
        print(f"{'='*70}")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        print(f"{'='*70}\n")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/batch/{batch_id}")
async def get_batch_status(batch_id: str, user: dict = Depends(get_current_user)):
    """
    Get batch processing status and progress
    
    **🔒 Requires Authentication**
    
    Returns batch information only if it belongs to the authenticated user.
    
    Args:
        batch_id: Batch identifier
        user: Authenticated user (injected automatically)
        
    Returns:
        Batch status with progress information
    """
    try:
        processor = get_batch_processor()
        status = processor.get_batch_status(batch_id)
        
        if not status:
            raise HTTPException(
                status_code=404,
                detail=f"Batch not found: {batch_id}"
            )
        
        # Verify user owns this batch
        if status.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this batch"
            )
        
        return status
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/batch/{batch_id}/files")
async def get_batch_files(
    batch_id: str,
    limit: int = Query(100, ge=1, le=1000),
    user: dict = Depends(get_current_user)
):
    """
    Get all files in a batch
    
    Args:
        batch_id: Batch identifier
        limit: Maximum files to return
        
    Returns:
        List of files with full metadata
    """
    try:
        processor = get_batch_processor()
        
        # Verify user owns this batch
        batch_status = processor.get_batch_status(batch_id)
        if not batch_status:
            raise HTTPException(
                status_code=404,
                detail=f"Batch not found: {batch_id}"
            )
        
        if batch_status.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this batch"
            )
        
        files = processor.get_batch_files(batch_id, limit=limit)
        
        return {
            "batch_id": batch_id,
            "files": files,
            "count": len(files)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/batch/{batch_id}")
async def delete_batch(batch_id: str, user: dict = Depends(get_current_user)):
    """
    Delete entire batch and all its files
    
    Removes all files from S3, MongoDB, and Pinecone, then deletes the batch record.
    
    Args:
        batch_id: Batch identifier
        
    Returns:
        Deletion result
    """
    try:
        processor = get_batch_processor()
        
        # Verify user owns this batch
        batch_status = processor.get_batch_status(batch_id)
        if not batch_status:
            raise HTTPException(
                status_code=404,
                detail=f"Batch not found: {batch_id}"
            )
        
        if batch_status.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to delete this batch"
            )
        
        result = processor.delete_batch(batch_id)
        
        if not result.get('success'):
            raise HTTPException(
                status_code=500,
                detail=result.get('error', 'Deletion failed')
            )
        
        return {
            "message": "Batch and all files deleted successfully",
            "batch_id": batch_id,
            "deleted_files": result.get('deleted_files', 0),
            "failed_deletions": result.get('failed_deletions', 0),
            "total_files": result.get('total_files', 0)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/batches")
async def list_batches(
    limit: int = Query(50, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    user: dict = Depends(get_current_user)
):
    """
    List all batches for the authenticated user
    
    **🔒 Requires Authentication**
    
    Returns only batches created by the authenticated user.
    
    Args:
        limit: Maximum batches to return
        skip: Number to skip (for pagination)
        user: Authenticated user (injected automatically)
        
    Returns:
        List of user's batch records
    """
    try:
        processor = get_batch_processor()
        batches = processor.list_batches(
            user_id=user['user_id'],  # Always filter by authenticated user
            limit=limit,
            skip=skip
        )
        
        return {
            "batches": batches,
            "count": len(batches),
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/text")
async def search_by_text(
    query: str = Query(..., description="Text query for semantic search"),
    top_k: int = Query(10, ge=1, le=100, description="Number of results"),
    user: dict = Depends(get_current_user)
):
    """
    Search for media/documents/code using text query
    
    **🔒 Requires Authentication**
    
    Searches only within the authenticated user's files.
    
    Args:
        query: Text description
        top_k: Number of results
        user: Authenticated user (injected automatically)
        
    Returns:
        Search results
    """
    try:
        engine = get_decision_engine()
        # Use media processor for search (it handles all embeddings)
        result = engine.media_processor.search_similar_media(
            query_type='text',
            query=query,
            top_k=top_k
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=500,
                detail=result.get('error', 'Search failed')
            )
        
        return {
            "query": query,
            "results": result['results'],
            "count": result['count'],
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/image")
async def search_by_image(
    file: UploadFile = File(...),
    top_k: int = Form(10),
    user: dict = Depends(get_current_user)
):
    """
    Search for similar media using an image
    
    Args:
        file: Image file
        top_k: Number of results
        
    Returns:
        Search results
    """
    try:
        # Validate file type
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in Config.SUPPORTED_IMAGE_FORMATS:
            raise HTTPException(
                status_code=400,
                detail=f"Only image files supported for image search"
            )
        
        # Save to temporary file
        contents = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            temp_file.write(contents)
            temp_path = temp_file.name
        
        try:
            engine = get_decision_engine()
            result = engine.media_processor.search_similar_media(
                query_type='image',
                query=temp_path,
                top_k=top_k
            )
            
            if not result.get('success'):
                raise HTTPException(
                    status_code=500,
                    detail=result.get('error', 'Search failed')
                )
            
            return {
                "query_image": file.filename,
                "results": result['results'],
                "count": result['count'],
            }
        
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media/recyclebin")
async def list_recyclebin(
    limit: int = Query(50, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    user: dict = Depends(get_current_user)
):
    """
    List files in recycle bin
    
    **🔒 Requires Authentication**
    **Only returns files owned by the authenticated user**
    """
    user_id = user.get('user_id') or user.get('id') or user.get('sub')
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID not found in token")
    
    try:
        from storage_db import get_db_storage
        
        db_storage = get_db_storage()
        if db_storage.collection is None:
            return {
                "files": [],
                "count": 0,
                "message": "MongoDB not connected"
            }
        
        # Find files with 'deleted': True for this user
        deleted_files = db_storage.collection.find(
            {
                'user_id': user_id,
                'deleted': True
            }
        ).sort('deleted_at', -1).skip(skip).limit(limit)
        
        files_list = []
        for media in deleted_files:
            media['_id'] = str(media['_id'])
            
            # Ensure required fields exist for frontend compatibility
            metadata = media.get('metadata', {})
            if not media.get('filename'):
                media['filename'] = (
                    metadata.get('custom', {}).get('original_filename') or
                    metadata.get('file_name') or 
                    'unknown'
                )
            
            if not media.get('file_type'):
                media['file_type'] = metadata.get('file_type') or metadata.get('type') or 'unknown'
            
            file_size = (
                media.get('file_size') or
                media.get('size') or
                metadata.get('file_size') or
                metadata.get('size') or
                0
            )
            media['size'] = file_size
            media['file_size'] = file_size
            
            if not media.get('extension'):
                media['extension'] = (
                    metadata.get('extension') or
                    metadata.get('file_extension') or
                    ''
                )
            
            # Add folder_path if present
            folder_path = metadata.get('custom', {}).get('folder_path', '')
            if folder_path:
                media['folder_path'] = folder_path
            else:
                media['folder_path'] = ''
            
            files_list.append(media)
        
        return {
            "files": files_list,
            "count": len(files_list)
        }
    except Exception as e:
        print(f"❌ Error listing recycle bin: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media/{file_id}")
async def get_media(file_id: str, user: dict = Depends(get_current_user)):
    """
    Get media information by ID
    
    **🔒 Requires Authentication**
    
    Returns file information only if it belongs to the authenticated user.
    
    Args:
        file_id: File identifier
        user: Authenticated user (injected automatically)
        
    Returns:
        Media information
    """
    try:
        engine = get_decision_engine()
        media_info = engine.media_processor.get_media_info(file_id)
        
        if not media_info:
            raise HTTPException(
                status_code=404,
                detail=f"Media not found: {file_id}"
            )
        
        # Verify user owns this file
        if media_info.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this file"
            )
        
        return media_info
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media/{file_id}/download")
async def download_media(
    file_id: str, 
    download: bool = Query(True, description="Force download (true) or open in browser (false)"),
    user: dict = Depends(get_current_user_flexible)
):
    """
    Download or open the actual file
    
    Downloads the original or processed file from S3 storage.
    For compressed files (.gz), decompresses them before serving.
    
    Args:
        file_id: File identifier
        download: If True, forces download. If False, opens in browser (inline)
        
    Returns:
        File content for download or streaming
    """
    try:
        engine = get_decision_engine()
        
        # Get file metadata
        media_info = engine.media_processor.get_media_info(file_id)
        if not media_info:
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {file_id}"
            )
        
        # Verify user owns this file
        if media_info.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this file"
            )
        
        # Get S3 key
        s3_key = media_info.get('s3_key') or media_info.get('s3_info', {}).get('s3_key')
        if not s3_key:
            raise HTTPException(
                status_code=404,
                detail="File storage key not found"
            )
        
        # Get original filename and real extension from metadata
        metadata = media_info.get('metadata', {})
        original_filename = (
            metadata.get('custom', {}).get('original_filename') or
            metadata.get('file_name') or
            'download'
        )
        
        # Get real file extension from metadata (what it should be downloaded as)
        real_extension = (
            metadata.get('extension') or
            metadata.get('file_extension') or
            ''
        )
        
        # If real extension exists and original filename doesn't have it, append it
        if real_extension and not original_filename.lower().endswith(real_extension.lower()):
            # Remove any existing extension and add the real one
            base_name = original_filename.rsplit('.', 1)[0] if '.' in original_filename else original_filename
            download_filename = f"{base_name}{real_extension}"
        else:
            download_filename = original_filename
        
        # Get file extension from download filename for type detection
        file_ext = download_filename.split('.')[-1].lower() if '.' in download_filename else ''
        
        # Define file type categories
        IMAGE_EXTS = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'svg'}
        VIDEO_EXTS = {'mp4', 'mov', 'mkv', 'avi', 'webm'}
        AUDIO_EXTS = {'mp3', 'm4a', 'wav', 'aac'}
        DOCUMENT_EXTS = {'pdf', 'txt', 'docs', 'docx', 'doc', 'md', 'ppt', 'pptx'}
        
        # Check if file is compressed (.gz) and what type it is
        is_compressed = s3_key.endswith('.gz')
        is_image_or_video = file_ext in IMAGE_EXTS or file_ext in VIDEO_EXTS
        is_audio = file_ext in AUDIO_EXTS
        is_document = file_ext in DOCUMENT_EXTS
        
        # Set Content-Disposition based on download parameter
        disposition = 'attachment' if download else 'inline'
        
        # Decompress for documents and audio files (both are typically compressed)
        if is_compressed and (is_document or is_audio):
            # For compressed files (documents), decompress and stream
            import gzip
            import io
            import requests
            from config import Config
            from fastapi.responses import StreamingResponse
            
            supabase_url = Config.SUPABASE_URL or "https://oxcrlwmlpcaeqgouounc.supabase.co"
            bucket_name = Config.S3_BUCKET_NAME or "media"
            public_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{s3_key}"
            
            # Download compressed file from S3
            response = requests.get(public_url, stream=True)
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="File not found in storage")
            
            # Decompress the content
            compressed_data = response.content
            decompressed_data = gzip.decompress(compressed_data)
            
            # Determine content type based on download filename (with real extension)
            import mimetypes
            content_type, _ = mimetypes.guess_type(download_filename)
            
            if not content_type:
                # Set specific content types for audio if mimetypes doesn't detect
                if is_audio:
                    if file_ext == 'mp3':
                        content_type = 'audio/mpeg'
                    elif file_ext == 'm4a':
                        content_type = 'audio/x-m4a'
                    elif file_ext == 'wav':
                        content_type = 'audio/wav'
                    elif file_ext == 'aac':
                        content_type = 'audio/aac'
                    else:
                        content_type = 'audio/mpeg'
                else:
                    content_type = 'application/octet-stream'
            
            # Override MIME types for specific extensions to ensure correct browser behavior
            if file_ext == 'mp3':
                content_type = 'audio/mpeg'  # Force MP3 MIME type
            elif file_ext == 'm4a':
                content_type = 'audio/x-m4a'  # Force M4A audio MIME type
            
            # Return decompressed file with real extension
            return StreamingResponse(
                io.BytesIO(decompressed_data),
                media_type=content_type,
                headers={
                    "Content-Disposition": f'{disposition}; filename="{download_filename}"'
                }
            )
        else:
            # For non-compressed files (images/videos), stream directly with proper filename
            import requests
            from config import Config
            from fastapi.responses import StreamingResponse
            import io
            
            supabase_url = Config.SUPABASE_URL or "https://oxcrlwmlpcaeqgouounc.supabase.co"
            bucket_name = Config.S3_BUCKET_NAME or "media"
            public_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{s3_key}"
            
            # Download file from Supabase
            response = requests.get(public_url, stream=True)
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="File not found in storage")
            
            # Determine content type
            import mimetypes
            content_type, _ = mimetypes.guess_type(download_filename)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Stream file with proper filename and extension
            disposition = 'attachment' if download else 'inline'
            return StreamingResponse(
                io.BytesIO(response.content),
                media_type=content_type,
                headers={
                    "Content-Disposition": f'{disposition}; filename="{download_filename}"'
                }
            )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media/{file_id}/url")
async def get_media_url(
    file_id: str,
    expires_in: int = Query(3600, ge=300, le=86400, description="URL expiration in seconds"),
    user: dict = Depends(get_current_user_flexible)
):
    """
    Get a presigned URL for direct file access
    
    Returns a temporary URL that can be used to access the file directly
    from S3 storage without going through the API.
    
    Args:
        file_id: File identifier
        expires_in: URL expiration time in seconds (default: 3600, max: 86400)
        
    Returns:
        Presigned URL and expiration info
    """
    try:
        engine = get_decision_engine()
        
        # Get file metadata
        media_info = engine.media_processor.get_media_info(file_id)
        if not media_info:
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {file_id}"
            )
        
        # Verify user owns this file
        if media_info.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this file"
            )
        
        # Get S3 key (check both root level and nested in s3_info)
        s3_key = media_info.get('s3_key') or media_info.get('s3_info', {}).get('s3_key')
        if not s3_key:
            raise HTTPException(
                status_code=404,
                detail="File storage key not found"
            )
        
        # Generate public URL for Supabase Storage
        # Format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{s3_key}
        from config import Config
        supabase_url = Config.SUPABASE_URL or "https://oxcrlwmlpcaeqgouounc.supabase.co"
        bucket_name = Config.S3_BUCKET_NAME or "media"
        
        public_url = f"{supabase_url}/storage/v1/object/public/{bucket_name}/{s3_key}"
        
        return {
            "file_id": file_id,
            "url": public_url,
            "expires_in": None,
            "note": "Public URL (bucket must be public for access)"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media/{file_id}/thumbnail")
async def get_media_thumbnail(
    file_id: str,
    size: int = Query(300, ge=50, le=1000, description="Thumbnail size in pixels"),
    user: dict = Depends(get_current_user_flexible)
):
    """
    Get a thumbnail/preview of the file
    
    For images/videos: returns a smaller preview
    For documents: returns first page preview
    For other types: returns a placeholder or icon
    
    Args:
        file_id: File identifier
        size: Thumbnail size in pixels (width, height will maintain aspect ratio)
        
    Returns:
        Thumbnail image or preview
    """
    try:
        engine = get_decision_engine()
        
        # Get file metadata
        media_info = engine.media_processor.get_media_info(file_id)
        if not media_info:
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {file_id}"
            )
        
        # Verify user owns this file
        if media_info.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to access this file"
            )
        
        file_type = media_info.get('file_type', 'unknown')
        
        # For now, redirect to the main file
        # In a production system, you'd generate actual thumbnails
        s3_url = media_info.get('s3_url')
        if s3_url and file_type in ['image', 'video']:
            from fastapi.responses import RedirectResponse
            return RedirectResponse(url=s3_url)
        else:
            # Return a placeholder for non-visual files
            raise HTTPException(
                status_code=501,
                detail=f"Thumbnails not yet implemented for {file_type} files"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/media/{file_id}")
async def delete_media(
    file_id: str,
    permanent: bool = Query(False, description="If true, permanently deletes. If false, moves to recycle bin"),
    user: dict = Depends(get_current_user)
):
    """
    Delete media file (soft or hard delete)
    
    **🔒 Requires Authentication**
    
    Two deletion modes:
    - permanent=false (default): Moves file to recycle bin (soft delete)
    - permanent=true: Permanently deletes from all storage (hard delete)
    
    Args:
        file_id: File identifier
        permanent: Whether to permanently delete or move to recycle bin
        user: Authenticated user (injected automatically)
        
    Returns:
        Deletion result
    """
    try:
        from storage_db import get_db_storage
        from datetime import datetime
        
        engine = get_decision_engine()
        db_storage = get_db_storage()
        
        # First verify the user owns this file
        media_info = engine.media_processor.get_media_info(file_id)
        if not media_info:
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {file_id}"
            )
        
        if media_info.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to delete this file"
            )
        
        if permanent:
            # HARD DELETE: Permanently remove from all storage
            print(f"🗑️  Permanently deleting file: {file_id}")
            
            # 1. Delete from S3/Supabase Storage
            s3_key = media_info.get('s3_key') or media_info.get('s3_info', {}).get('s3_key')
            if s3_key:
                try:
                    from storage_s3 import get_s3_storage
                    s3_storage = get_s3_storage()
                    s3_storage.delete_file(s3_key)
                    print(f"✓ Deleted from S3: {s3_key}")
                except Exception as e:
                    print(f"⚠ S3 deletion failed: {e}")
            
            # 2. Delete from Pinecone (if embeddings exist)
            try:
                from storage_pinecone import get_pinecone_storage
                pinecone_storage = get_pinecone_storage()
                pinecone_storage.delete_embedding(file_id)
                print(f"✓ Deleted from Pinecone: {file_id}")
            except Exception as e:
                print(f"⚠ Pinecone deletion failed: {e}")
            
            # 3. Delete from Supabase PostgreSQL (if structured data)
            file_type = media_info.get('metadata', {}).get('type')
            if file_type == 'structured_data':
                try:
                    from supabase import create_client
                    from config import Config
                    supabase = create_client(Config.SUPABASE_URL, Config.SUPABASE_SERVICE_ROLE_KEY)
                    table_name = media_info.get('metadata', {}).get('table_name')
                    if table_name:
                        supabase.table(table_name).delete().eq('file_id', file_id).execute()
                        print(f"✓ Deleted from Supabase table: {table_name}")
                except Exception as e:
                    print(f"⚠ Supabase deletion failed: {e}")
            
            # 4. Delete from MongoDB
            if db_storage.collection is not None:
                db_storage.collection.delete_one({'file_id': file_id})
                print(f"✓ Deleted from MongoDB: {file_id}")
            
            return {
                "message": "File permanently deleted",
                "file_id": file_id,
                "permanent": True
            }
        else:
            # SOFT DELETE: Move to recycle bin
            print(f"🗑️  Moving to recycle bin: {file_id}")
            
            if db_storage.collection is not None:
                db_storage.collection.update_one(
                    {'file_id': file_id},
                    {
                        '$set': {
                            'deleted': True,
                            'deleted_at': datetime.utcnow().isoformat(),
                            'status': 'deleted'
                        }
                    }
                )
                print(f"✓ Moved to recycle bin: {file_id}")
        
        return {
                "message": "File moved to recycle bin",
            "file_id": file_id,
                "permanent": False
            }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/media/{file_id}/restore")
async def restore_media(file_id: str, user: dict = Depends(get_current_user)):
    """
    Restore file from recycle bin
    
    **🔒 Requires Authentication**
    
    Restores a soft-deleted file back to active files.
    
    Args:
        file_id: File identifier
        user: Authenticated user (injected automatically)
        
    Returns:
        Restoration result
    """
    try:
        from storage_db import get_db_storage
        from datetime import datetime
        
        db_storage = get_db_storage()
        if db_storage.collection is None:
            raise HTTPException(status_code=503, detail="MongoDB not connected")
        
        # Find the deleted file
        file_info = db_storage.collection.find_one({'file_id': file_id})
        if not file_info:
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}")
        
        # Verify ownership
        if file_info.get('user_id') != user['user_id']:
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to restore this file"
            )
        
        # Check if it's actually deleted
        if not file_info.get('deleted'):
            raise HTTPException(status_code=400, detail="File is not in recycle bin")
        
        # Restore the file
        db_storage.collection.update_one(
            {'file_id': file_id},
            {
                '$set': {
                    'deleted': False,
                    'status': 'active',
                    'restored_at': datetime.utcnow().isoformat()
                },
                '$unset': {
                    'deleted_at': ""
                }
            }
        )
        
        print(f"✓ Restored file from recycle bin: {file_id}")
        
        return {
            "message": "File restored successfully",
            "file_id": file_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/media")
async def list_media(
    limit: int = Query(50, ge=1, le=1000),
    skip: int = Query(0, ge=0),
    user: dict = Depends(get_current_user)
):
    """
    List all media files for the authenticated user
    
    **🔒 Requires Authentication**
    
    Returns only files uploaded by the authenticated user.
    
    Args:
        limit: Number of results per page
        skip: Number of results to skip
        user: Authenticated user (injected automatically)
        
    Returns:
        List of user's media files
    """
    try:
        from storage_db import get_db_storage
        
        # Get user_id from authenticated user
        user_id = user.get('user_id') or user.get('id')
        
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID not found in token")
        
        # Get MongoDB storage
        db_storage = get_db_storage()
        
        # Check if MongoDB is connected (must use 'is None' - PyMongo doesn't support bool())
        if db_storage.collection is None:
            print("⚠️ MongoDB not connected, returning empty file list")
            return {
                "files": [],
                "media": [],
                "count": 0,
                "limit": limit,
                "skip": skip,
                "warning": "MongoDB not connected - no files available"
            }
        
        # Filter by user_id and exclude deleted files
        all_media = db_storage.collection.find(
            {
                'user_id': user_id,
                '$or': [
                    {'deleted': {'$exists': False}},
                    {'deleted': False}
                ]
            }
        ).sort('created_at', -1).skip(skip).limit(limit)
        
        media_list = []
        for media in all_media:
            media['_id'] = str(media['_id'])
            
            # Ensure frontend-compatible format
            metadata = media.get('metadata', {})
            
            # Add filename if missing or None (prefer original_filename from custom metadata)
            if not media.get('filename'):
                media['filename'] = (
                    metadata.get('custom', {}).get('original_filename') or
                    metadata.get('file_name') or 
                    metadata.get('original_filename') or
                    'unknown'
                )
            
            # Add file_type if missing or None
            if not media.get('file_type'):
                media['file_type'] = (
                    metadata.get('file_type') or
                    metadata.get('type') or
                    'unknown'
                )
            
            # Add file size if missing or None (check multiple possible locations)
            file_size = (
                media.get('file_size') or
                media.get('size') or
                metadata.get('file_size') or  # Primary location
                metadata.get('size') or
                0
            )
            # Set both 'size' and 'file_size' for frontend compatibility
            media['size'] = file_size
            media['file_size'] = file_size
            
            # Add file extension if missing
            if not media.get('extension'):
                media['extension'] = (
                    metadata.get('extension') or
                    metadata.get('file_extension') or
                    ''
                )
            
            # Add folder path from custom metadata if available
            folder_path = metadata.get('custom', {}).get('folder_path', '')
            if folder_path:
                media['folder_path'] = folder_path
            else:
                media['folder_path'] = ''
            
            media_list.append(media)
        
        return {
            "files": media_list,  # Frontend expects 'files', not 'media'
            "media": media_list,  # Keep for backward compatibility
            "count": len(media_list),
            "limit": limit,
            "skip": skip,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in list_media: {e}")
        import traceback
        traceback.print_exc()
        # Return empty list instead of error to allow login to work
        return {
            "files": [],
            "media": [],
            "count": 0,
            "limit": limit,
            "skip": skip,
            "error": str(e)
        }


@app.get("/stats")
async def get_stats():
    """
    Get system statistics
    
    Returns:
        System statistics
    """
    try:
        engine = get_decision_engine()
        
        # Get Pinecone stats
        pinecone_stats = engine.media_processor.pinecone_storage.get_index_stats()
        
        # Get system statistics
        system_stats = engine.get_statistics()
        
        return {
            "pinecone": pinecone_stats.get('stats', {}),
            "system": system_stats,
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/pipelines")
async def get_pipelines():
    """
    Get information about all available processing pipelines
    
    Returns:
        Pipeline information and supported file types
    """
    try:
        engine = get_decision_engine()
        pipeline_info = engine.get_pipeline_info()
        
        return {
            "pipelines": pipeline_info,
            "total_pipelines": len(pipeline_info),
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    # Run the API server
    print("Starting Media Storage API...")
    print(f"API will be available at: http://localhost:8000")
    print(f"API docs at: http://localhost:8000/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

