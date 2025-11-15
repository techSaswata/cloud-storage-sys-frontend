/**
 * API Service for Backend Communication
 * Backend: http://localhost:8000
 * Documentation: API.md, RETRIEVAL_GUIDE.md, AUTH.md
 * 
 * ⚠️ ALL ENDPOINTS NOW REQUIRE AUTHENTICATION
 * Include Authorization: Bearer {token} header in all requests
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

// Helper to get auth headers
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('Not authenticated. Please sign in.');
  }
  return {
    'Authorization': `Bearer ${token}`,
  };
}

// ============= TYPES =============

export interface BackendFile {
  file_id: string;
  filename: string;
  file_type: 'image' | 'video' | 'audio' | 'document' | 'code' | 'generic' | 'folder';
  file_size: number;
  mime_type: string;
  s3_url: string;
  s3_key: string;
  metadata: {
    original_filename?: string;
    dimensions?: {
      width: number;
      height: number;
    };
    format?: string;
    compression_format?: string;
    duration?: number;
    [key: string]: any;
  };
  embedding_id?: string;
  created_at: string;
  updated_at: string;
  batch_id?: string;
  isFavorite?: boolean;
  deleted_at?: string;
  deleted?: boolean;
  status?: string;
  extension?: string;
  size?: number;
  folder_path?: string;
  isFolder?: boolean;
}

export interface UploadResponse {
  message: string;
  file_id: string;
  pipeline: string;
  pipeline_description: string;
  metadata: {
    filename: string;
    file_type: string;
    file_size: number;
    mime_type: string;
    dimensions?: {
      width: number;
      height: number;
    };
    created_at: string;
  };
  compression_stats?: {
    original_size: number;
    compressed_size: number;
    compression_ratio: number;
    format: string;
  };
  s3_url: string;
  s3_key: string;
  embedding_info?: {
    model: string;
    dimension: number;
    pinecone_id: string;
  };
}

export interface BatchUploadResponse {
  message: string;
  batch_id: string;
  batch_name: string;
  total_files: number;
  successful: number;
  failed: number;
  progress_percentage: number;
  status: 'completed' | 'processing' | 'failed';
  files: Array<{
    filename: string;
    status: 'success' | 'failed';
    file_id?: string;
    pipeline?: string;
    pipeline_description?: string;
    compression_ratio?: number;
    error?: string;
  }>;
}

export interface FileUrlResponse {
  file_id: string;
  url: string;
  expires_in: number | null;
  expires_at?: string;
  note?: string;
}

export interface ListFilesResponse {
  count: number;
  limit: number;
  skip: number;
  total: number;
  files: BackendFile[];
}

// ============= API FUNCTIONS =============

/**
 * Upload a single file to the backend
 * ⚠️ REQUIRES AUTHENTICATION
 */
export async function uploadFile(
  file: File,
  options: {
    compress?: boolean;
    generate_embeddings?: boolean;
    folder_path?: string;
  } = {}
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('compress', String(options.compress ?? true));
  formData.append('generate_embeddings', String(options.generate_embeddings ?? true));
  if (options.folder_path) {
    formData.append('folder_path', options.folder_path);
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

/**
 * Upload multiple files as a batch
 * ⚠️ REQUIRES AUTHENTICATION
 * Note: user_id is now automatic from token (remove from options)
 */
export async function uploadBatch(
  files: File[],
  options: {
    batch_name?: string;
    compress?: boolean;
    generate_embeddings?: boolean;
    max_concurrent?: number;
    folder_paths?: Record<string, string>; // Map of filename to folder path
  } = {}
): Promise<BatchUploadResponse> {
  const formData = new FormData();
  
  files.forEach(file => {
    formData.append('files', file);
  });
  
  if (options.batch_name) formData.append('batch_name', options.batch_name);
  // user_id is now automatic from auth token - don't include it
  formData.append('compress', String(options.compress ?? true));
  formData.append('generate_embeddings', String(options.generate_embeddings ?? true));
  if (options.max_concurrent) formData.append('max_concurrent', String(options.max_concurrent));
  
  // Add folder paths if provided
  if (options.folder_paths) {
    formData.append('folder_paths', JSON.stringify(options.folder_paths));
  }

  const response = await fetch(`${API_BASE}/upload/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Batch upload failed' }));
    throw new Error(error.detail || 'Batch upload failed');
  }

  return response.json();
}

/**
 * List all files with pagination and filtering
 * ⚠️ REQUIRES AUTHENTICATION - Returns only user's files
 */
export async function listFiles(options: {
  limit?: number;
  skip?: number;
  file_type?: string;
} = {}): Promise<ListFilesResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', String(options.limit));
  if (options.skip) params.append('skip', String(options.skip));
  if (options.file_type) params.append('file_type', options.file_type);

  const response = await fetch(`${API_BASE}/media?${params}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to list files');
  }

  return response.json();
}

/**
 * Get file metadata by ID
 * ⚠️ REQUIRES AUTHENTICATION - Only returns if user owns file
 */
export async function getFileMetadata(fileId: string): Promise<BackendFile> {
  const response = await fetch(`${API_BASE}/media/${fileId}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('File not found');
  }

  return response.json();
}

/**
 * Get direct URL for a file (presigned URL)
 * ⚠️ REQUIRES AUTHENTICATION - Only returns URL if user owns file
 */
export async function getFileUrl(
  fileId: string,
  expiresIn: number = 3600
): Promise<FileUrlResponse> {
  const response = await fetch(`${API_BASE}/media/${fileId}/url?expires_in=${expiresIn}`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get file URL');
  }

  return response.json();
}

/**
 * Get thumbnail URL for a file
 * ⚠️ REQUIRES AUTHENTICATION
 * Note: For <img> tags, you need to fetch the thumbnail and use blob URL
 * or include token in URL query parameter
 */
export function getThumbnailUrl(fileId: string, size: number = 300): string {
  const token = localStorage.getItem('access_token');
  return `${API_BASE}/media/${fileId}/thumbnail?size=${size}&token=${token}`;
}

/**
 * Get download URL for a file
 * ⚠️ REQUIRES AUTHENTICATION
 * Note: Include token in URL for direct downloads
 * @param fileId - The file ID
 * @param forceDownload - If true, forces download. If false, opens in browser
 */
export function getDownloadUrl(fileId: string, forceDownload: boolean = true): string {
  const token = localStorage.getItem('access_token');
  return `${API_BASE}/media/${fileId}/download?token=${token}&download=${forceDownload}`;
}

/**
 * Soft delete a file (move to recycle bin)
 * ⚠️ REQUIRES AUTHENTICATION - Only deletes if user owns file
 */
export async function deleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/media/${fileId}?permanent=false`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
}

/**
 * Permanently delete a file (cannot be restored)
 * ⚠️ REQUIRES AUTHENTICATION - Only deletes if user owns file
 */
export async function permanentlyDeleteFile(fileId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/media/${fileId}?permanent=true`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to permanently delete file');
  }
}

/**
 * Get files in recycle bin
 * ⚠️ REQUIRES AUTHENTICATION
 */
export async function getRecycleBin(): Promise<{ files: BackendFile[]; count: number }> {
  const response = await fetch(`${API_BASE}/media/recyclebin`, {
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Failed to get recycle bin');
  }

  return response.json();
}

/**
 * Restore a file from recycle bin
 * ⚠️ REQUIRES AUTHENTICATION
 */
export async function restoreFile(fileId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/media/${fileId}/restore`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to restore file');
  }
}

/**
 * Search files by text query
 * ⚠️ REQUIRES AUTHENTICATION - Searches only user's files
 */
export async function searchByText(query: string, topK: number = 10) {
  const params = new URLSearchParams({ query, top_k: String(topK) });
  const response = await fetch(`${API_BASE}/search/text?${params}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  
  if (!response.ok) {
    throw new Error('Search failed');
  }

  return response.json();
}

/**
 * Search files by image
 * ⚠️ REQUIRES AUTHENTICATION - Searches only user's files
 */
export async function searchByImage(imageFile: File, topK: number = 10) {
  const formData = new FormData();
  formData.append('file', imageFile);
  formData.append('top_k', String(topK));

  const response = await fetch(`${API_BASE}/search/image`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Image search failed');
  }

  return response.json();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ status: string }> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
  } catch (error) {
    return { status: 'unhealthy' };
  }
}

/**
 * Get system statistics
 */
export async function getSystemStats() {
  const response = await fetch(`${API_BASE}/stats`);
  
  if (!response.ok) {
    throw new Error('Failed to get stats');
  }

  return response.json();
}

/**
 * Create an empty folder
 * ⚠️ REQUIRES AUTHENTICATION
 */
export async function createFolder(folderName: string, folderPath?: string): Promise<{
  message: string;
  file_id: string;
  folder_name: string;
  folder_path: string;
  full_path: string;
  created_at: string;
}> {
  const response = await fetch(`${API_BASE}/folders/create`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      folder_name: folderName,
      folder_path: folderPath || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to create folder' }));
    throw new Error(error.detail || 'Failed to create folder');
  }

  return response.json();
}

