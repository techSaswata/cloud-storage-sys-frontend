'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BackendFile, listFiles, healthCheck } from '@/lib/apiService';

interface FilesContextType {
  files: BackendFile[];
  loading: boolean;
  error: string | null;
  refreshFiles: () => Promise<void>;
  isBackendHealthy: boolean;
}

const FilesContext = createContext<FilesContextType | undefined>(undefined);

export function FilesProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<BackendFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBackendHealthy, setIsBackendHealthy] = useState(true);
  const [lastFileCount, setLastFileCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      setIsAuthenticated(!!token);
    };

    checkAuth();

    // Listen for auth changes
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Refresh files from backend
  const refreshFiles = useCallback(async () => {
    // Skip if not authenticated
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      const response = await listFiles({ limit: 500 });
      setFiles(response.files);
      setError(null);
      
      // Check if new files were added
      if (response.files.length > lastFileCount && lastFileCount > 0) {
        console.log(`🎉 New files detected! ${response.files.length - lastFileCount} new file(s)`);
        // Dispatch custom event for components to react to new files
        window.dispatchEvent(new CustomEvent('newFilesDetected', { 
          detail: { 
            newCount: response.files.length - lastFileCount,
            totalCount: response.files.length 
          } 
        }));
      }
      
      setLastFileCount(response.files.length);
    } catch (err) {
      console.error('Failed to fetch files:', err);
      
      // If authentication error, don't show error (user not logged in)
      if (err instanceof Error && err.message.includes('Not authenticated')) {
        setFiles([]);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch files');
      }
    } finally {
      setLoading(false);
    }
  }, [lastFileCount, isAuthenticated]);

  // Check backend health
  const checkHealth = useCallback(async () => {
    try {
      const health = await healthCheck();
      const healthy = health.status === 'healthy';
      setIsBackendHealthy(healthy);
      
      if (!healthy) {
        console.warn('⚠️ Backend is not healthy');
      }
    } catch (err) {
      setIsBackendHealthy(false);
      console.error('Backend health check failed:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🚀 FilesContext initialized - connecting to backend...');
      checkHealth();
      refreshFiles();
    }
  }, [isAuthenticated]);

  // Auto-poll for new files every 2 seconds (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('⏸️  Auto-polling paused - user not authenticated');
      return;
    }

    console.log('⏰ Setting up auto-polling (every 2 seconds)');
    
    const pollInterval = setInterval(() => {
      if (isBackendHealthy && isAuthenticated) {
        refreshFiles();
      }
    }, 2000); // Poll every 2 seconds

    // Health check every 10 seconds
    const healthInterval = setInterval(() => {
      checkHealth();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(healthInterval);
    };
  }, [refreshFiles, checkHealth, isBackendHealthy, isAuthenticated]);

  return (
    <FilesContext.Provider
      value={{
        files,
        loading,
        error,
        refreshFiles,
        isBackendHealthy,
      }}
    >
      {children}
    </FilesContext.Provider>
  );
}

export function useFiles() {
  const context = useContext(FilesContext);
  if (context === undefined) {
    throw new Error('useFiles must be used within a FilesProvider');
  }
  return context;
}

