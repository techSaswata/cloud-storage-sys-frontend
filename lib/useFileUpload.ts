import { useState } from 'react';
import { uploadFile as apiUploadFile, uploadBatch as apiUploadBatch, UploadResponse, BatchUploadResponse } from './apiService';

interface UploadProgress {
  fileName: string;
  progress: number;
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File): Promise<UploadResponse | null> => {
    console.log('🚀 Starting upload for file:', file.name);
    setUploading(true);
    setError(null);
    setProgress({ fileName: file.name, progress: 0 });

    try {
      // Simulate progress updates (since fetch doesn't provide upload progress easily)
      setProgress({ fileName: file.name, progress: 30 });
      
      const result = await apiUploadFile(file, {
        compress: true,
        generate_embeddings: true,
      });

      setProgress({ fileName: file.name, progress: 100 });
      console.log('✅ Upload successful:', result);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('fileUploaded', { detail: result }));
      
      setTimeout(() => {
        setProgress(null);
        setUploading(false);
      }, 500);

      return result;
    } catch (err) {
      console.error('❌ Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress(null);
      setUploading(false);
      return null;
    }
  };

  const uploadMultipleFiles = async (files: FileList | File[]): Promise<BatchUploadResponse | null> => {
    const fileArray = Array.from(files);
    console.log(`🚀 Starting batch upload for ${fileArray.length} files`);
    
    setUploading(true);
    setError(null);
    setProgress({ fileName: `${fileArray.length} files`, progress: 0 });

    try {
      setProgress({ fileName: `${fileArray.length} files`, progress: 30 });
      
      const result = await apiUploadBatch(fileArray, {
        batch_name: `Upload ${new Date().toLocaleString()}`,
        compress: true,
        generate_embeddings: true,
        max_concurrent: 5,
      });

      setProgress({ fileName: `${fileArray.length} files`, progress: 100 });
      console.log('✅ Batch upload successful:', result);
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('batchUploaded', { detail: result }));
      
      setTimeout(() => {
        setProgress(null);
        setUploading(false);
      }, 500);

      return result;
    } catch (err) {
      console.error('❌ Batch upload error:', err);
      setError(err instanceof Error ? err.message : 'Batch upload failed');
      setProgress(null);
      setUploading(false);
      return null;
    }
  };

  return {
    uploadFile,
    uploadMultipleFiles,
    uploading,
    progress,
    error,
  };
}
