'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BackendFile, getRecycleBin, restoreFile, permanentlyDeleteFile } from '@/lib/apiService';
import { Document24Regular } from '@fluentui/react-icons';

interface FolderItem {
  id: string;
  name: string;
  isFolder: true;
  itemCount: number;
  created_at: string;
  folder_path: string;
  deleted_at?: string;
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString();
}

// Helper function to format file size
function formatFileSize(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

const RecycleBinView: React.FC = () => {
  const [allFiles, setAllFiles] = useState<BackendFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [hoveredHeader, setHoveredHeader] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(''); // Current folder path in recycle bin

  // Compute folders and files for current path
  const { folders, filesInCurrentFolder } = useMemo(() => {
    const folderSet = new Map<string, { count: number; created_at: string; deleted_at?: string }>();
    const filesHere: BackendFile[] = [];

    allFiles.forEach(file => {
      const filePath = file.folder_path || '';
      
      if (currentPath === '') {
        // At root level
        if (!filePath) {
          filesHere.push(file);
        } else {
          const firstFolder = filePath.split('/')[0];
          if (firstFolder) {
            const existing = folderSet.get(firstFolder);
            if (!existing || new Date(file.created_at) > new Date(existing.created_at)) {
              folderSet.set(firstFolder, { 
                count: (existing?.count || 0) + 1,
                created_at: file.created_at,
                deleted_at: file.deleted_at
              });
            } else {
              folderSet.set(firstFolder, { 
                count: existing.count + 1,
                created_at: existing.created_at,
                deleted_at: existing.deleted_at
              });
            }
          }
        }
      } else {
        // In a specific folder
        if (filePath === currentPath) {
          filesHere.push(file);
        } else if (filePath.startsWith(currentPath + '/')) {
          const relativePath = filePath.substring(currentPath.length + 1);
          const nextFolder = relativePath.split('/')[0];
          if (nextFolder) {
            const existing = folderSet.get(nextFolder);
            if (!existing || new Date(file.created_at) > new Date(existing.created_at)) {
              folderSet.set(nextFolder, { 
                count: (existing?.count || 0) + 1,
                created_at: file.created_at,
                deleted_at: file.deleted_at
              });
            } else {
              folderSet.set(nextFolder, { 
                count: existing.count + 1,
                created_at: existing.created_at,
                deleted_at: existing.deleted_at
              });
            }
          }
        }
      }
    });

    const foldersArray: FolderItem[] = Array.from(folderSet.entries()).map(([name, data]) => ({
      id: `folder_${currentPath}/${name}`,
      name,
      isFolder: true as const,
      itemCount: data.count,
      created_at: data.created_at,
      folder_path: currentPath ? `${currentPath}/${name}` : name,
      deleted_at: data.deleted_at
    }));

    return {
      folders: foldersArray,
      filesInCurrentFolder: filesHere
    };
  }, [allFiles, currentPath]);

  // Combined list of folders and files
  const items = [...folders, ...filesInCurrentFolder];
  const files = items; // For backward compatibility with existing code

  // Generate breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [{ name: 'Recycle bin', path: '' }];
    
    const parts = currentPath.split('/');
    const crumbs = [{ name: 'Recycle bin', path: '' }];
    
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/');
      crumbs.push({ name: part, path });
    });
    
    return crumbs;
  }, [currentPath]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await getRecycleBin();
      setAllFiles(response.files);
    } catch (err) {
      console.error('Failed to load recycle bin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (selectedFiles.size === 0) return;

    const selectedIds = Array.from(selectedFiles);
    const filesToRestore: string[] = [];
    
    // Process each selected item
    for (const itemId of selectedIds) {
      if (itemId.startsWith('folder_')) {
        // It's a folder - extract the folder path
        let folderPath = itemId.substring('folder_'.length);
        if (folderPath.startsWith('/')) {
          folderPath = folderPath.substring(1);
        }
        
        // Find all files in this folder and subfolders
        const filesInFolder = allFiles.filter(file => {
          const fileFolderPath = file.folder_path || '';
          return fileFolderPath === folderPath || fileFolderPath.startsWith(folderPath + '/');
        });
        
        filesInFolder.forEach(file => filesToRestore.push(file.file_id));
      } else {
        filesToRestore.push(itemId);
      }
    }

    const confirmMessage = filesToRestore.length === 1
      ? 'Restore this file?'
      : `Restore ${filesToRestore.length} file(s)?`;

    if (!confirm(confirmMessage)) return;

    try {
      for (const fileId of filesToRestore) {
        await restoreFile(fileId);
      }
      setSelectedFiles(new Set());
      await loadFiles();
      console.log(`✓ ${filesToRestore.length} file(s) restored`);
    } catch (err) {
      console.error('Failed to restore files:', err);
      alert('Failed to restore files');
    }
  };

  const handlePermanentDelete = async () => {
    if (selectedFiles.size === 0) return;

    const selectedIds = Array.from(selectedFiles);
    const filesToDelete: string[] = [];
    
    // Process each selected item
    for (const itemId of selectedIds) {
      if (itemId.startsWith('folder_')) {
        // It's a folder - extract the folder path
        let folderPath = itemId.substring('folder_'.length);
        if (folderPath.startsWith('/')) {
          folderPath = folderPath.substring(1);
        }
        
        // Find all files in this folder and subfolders
        const filesInFolder = allFiles.filter(file => {
          const fileFolderPath = file.folder_path || '';
          return fileFolderPath === folderPath || fileFolderPath.startsWith(folderPath + '/');
        });
        
        filesInFolder.forEach(file => filesToDelete.push(file.file_id));
      } else {
        filesToDelete.push(itemId);
      }
    }

    const confirmMessage = filesToDelete.length === 1
      ? 'Are you sure you want to permanently delete this file? This action cannot be undone.'
      : `Are you sure you want to permanently delete ${filesToDelete.length} file(s)? This action cannot be undone.`;

    if (!confirm(confirmMessage)) return;

    try {
      for (const fileId of filesToDelete) {
        await permanentlyDeleteFile(fileId);
      }
      setSelectedFiles(new Set());
      await loadFiles();
      console.log(`✓ ${filesToDelete.length} file(s) permanently deleted`);
    } catch (err) {
      console.error('Failed to permanently delete files:', err);
      alert('Failed to permanently delete files');
    }
  };

  const handleEmptyRecycleBin = async () => {
    if (allFiles.length === 0) return;

    if (!confirm(`Are you sure you want to empty the Recycle Bin? All ${allFiles.length} file(s) will be permanently deleted. This action cannot be undone.`)) {
      return;
    }

    try {
      for (const file of allFiles) {
        await permanentlyDeleteFile(file.file_id);
      }
      await loadFiles();
      console.log('✓ Recycle bin emptied');
    } catch (err) {
      console.error('Failed to empty recycle bin:', err);
      alert('Failed to empty recycle bin');
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading recycle bin...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 16px' }}>
      {/* Action buttons bar (shown when files are selected) */}
      {selectedFiles.size > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
            padding: '12px 16px',
            backgroundColor: 'rgb(32, 31, 30)',
            borderRadius: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Restore button */}
            <button
              onClick={handleRestore}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'rgb(255, 255, 255)',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                borderRadius: '4px',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 2.5a5.5 5.5 0 0 0-4.227 9.022.5.5 0 0 1-.546.817A6.5 6.5 0 1 1 14.5 9h-2.086l1.793 1.793a.5.5 0 0 1-.707.707l-2.5-2.5a.5.5 0 0 1 0-.707l2.5-2.5a.5.5 0 1 1 .707.707L12.414 8H14.5a5.5 5.5 0 0 0-6.5-5.5Z" />
              </svg>
              Restore
            </button>

            {/* Delete button */}
            <button
              onClick={handlePermanentDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'rgb(255, 255, 255)',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                borderRadius: '4px',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.5 2A1.5 1.5 0 0 0 7 3.5V4H3.5a.5.5 0 0 0 0 1h.441l.443 9.67A2 2 0 0 0 6.383 17h7.234a2 2 0 0 0 1.998-1.83l.443-9.67h.442a.5.5 0 0 0 0-1H13v-.5A1.5 1.5 0 0 0 11.5 2h-3ZM12 4v-.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5V4h4Zm3.938 1H4.062l.438 9.567a1 1 0 0 0 .998.916h7.005a1 1 0 0 0 .998-.916l.438-9.567ZM7.5 7a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5Zm5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5Z" />
              </svg>
              Delete
            </button>
          </div>

          {/* Selection counter */}
          <button
            onClick={() => setSelectedFiles(new Set())}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: 'rgb(51, 50, 49)',
              border: '1px solid rgb(71, 70, 69)',
              color: 'rgb(255, 255, 255)',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
              borderRadius: '20px',
              transition: 'background-color 0.1s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(61, 60, 59)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2.146 2.146a.5.5 0 0 1 .708 0L6 5.293l3.146-3.147a.5.5 0 0 1 .708.708L6.707 6l3.147 3.146a.5.5 0 0 1-.708.708L6 6.707l-3.146 3.147a.5.5 0 0 1-.708-.708L5.293 6 2.146 2.854a.5.5 0 0 1 0-.708Z" />
            </svg>
            {selectedFiles.size} selected
          </button>
        </div>
      )}

      {/* Command bar (shown when no files are selected) */}
      {selectedFiles.size === 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            padding: '0 8px',
            height: '52px',
            borderRadius: '12px',
            fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif'
          }}
        >
          {/* Left section - Empty Recycle Bin */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {allFiles.length > 0 && (
              <button
                onClick={handleEmptyRecycleBin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  margin: '0 2px',
                  minWidth: '40px',
                  height: '40px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'rgb(243, 242, 241)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                  borderRadius: '4px',
                  transition: 'background-color 0.1s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.5 2A1.5 1.5 0 0 0 7 3.5V4H3.5a.5.5 0 0 0 0 1h.441l.443 9.67A2 2 0 0 0 6.383 17h7.234a2 2 0 0 0 1.998-1.83l.443-9.67h.442a.5.5 0 0 0 0-1H13v-.5A1.5 1.5 0 0 0 11.5 2h-3ZM12 4v-.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5V4h4Zm3.938 1H4.062l.438 9.567a1 1 0 0 0 .998.916h7.005a1 1 0 0 0 .998-.916l.438-9.567ZM7.5 7a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5Zm5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0v-6a.5.5 0 0 1 .5-.5Z" />
                </svg>
                <span>Empty Recycle Bin</span>
              </button>
            )}
          </div>

          {/* Right section - Sort, View, Details */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0', paddingRight: '6px' }}>
            {/* Sort button */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                margin: '0 2px',
                minWidth: '40px',
                height: '40px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'rgb(243, 242, 241)',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                borderRadius: '4px',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2.5 4.5a.5.5 0 0 1 .5-.5h14a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5Zm0 5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5Zm.5 4.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1H3Z" />
              </svg>
              <span>Sort</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.15 4.65c.2-.2.5-.2.7 0L6 7.79l3.15-3.14a.5.5 0 1 1 .7.7l-3.5 3.5a.5.5 0 0 1-.7 0l-3.5-3.5a.5.5 0 0 1 0-.7Z" />
              </svg>
            </button>

            {/* View button */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                margin: '0 2px',
                minWidth: '40px',
                height: '40px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'rgb(243, 242, 241)',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                borderRadius: '4px',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h13A1.5 1.5 0 0 1 18 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5v-9ZM3.5 5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13ZM5 7a.5.5 0 0 0 0 1h6a.5.5 0 0 0 0-1H5Zm0 2.5a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1H5Z" />
              </svg>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2.15 4.65c.2-.2.5-.2.7 0L6 7.79l3.15-3.14a.5.5 0 1 1 .7.7l-3.5 3.5a.5.5 0 0 1-.7 0l-3.5-3.5a.5.5 0 0 1 0-.7Z" />
              </svg>
            </button>

            {/* Details button */}
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                margin: '0 2px',
                minWidth: '40px',
                height: '40px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'rgb(243, 242, 241)',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                borderRadius: '4px',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h11A1.5 1.5 0 0 1 17 3.5v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13ZM4.5 3a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5H9V3H4.5Zm5.5 14h5.5a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5H10v14Z" />
              </svg>
              <span>Details</span>
            </button>
          </div>
        </div>
      )}

      {/* Breadcrumb navigation */}
      <div style={{
        marginBottom: '24px',
        fontSize: '14px',
        color: 'rgb(200, 198, 196)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif'
      }}>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <button
              onClick={() => setCurrentPath(crumb.path)}
              style={{
                background: 'none',
                border: 'none',
                color: index === breadcrumbs.length - 1 ? 'rgb(255, 255, 255)' : 'rgb(71, 158, 245)',
                cursor: index === breadcrumbs.length - 1 ? 'default' : 'pointer',
                padding: 0,
                fontSize: index === 0 ? '20px' : '14px',
                fontWeight: index === 0 ? 600 : (index === breadcrumbs.length - 1 ? 600 : 400),
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                if (index !== breadcrumbs.length - 1) {
                  e.currentTarget.style.textDecoration = 'underline';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textDecoration = 'none';
              }}
            >
              {crumb.name}
            </button>
            {index < breadcrumbs.length - 1 && <span style={{ color: 'rgb(150, 150, 150)' }}>›</span>}
          </React.Fragment>
        ))}
      </div>

      {/* File list table */}
      <div
        style={{
          border: '1px solid rgb(41, 40, 39)',
          borderRadius: '12px',
          backgroundColor: 'rgb(41, 40, 39)',
          paddingBottom: '12px',
          fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
          fontSize: '12px',
          color: 'rgb(173, 173, 173)',
          overflow: 'hidden'
        }}
      >
        {/* Table header row with 5 columns (checkbox + icon + 3 columns) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '56px 40px 434px 300px 200px',
            backgroundColor: 'rgb(41, 40, 39)',
            position: 'relative'
          }}
          role="row"
        >
          {/* Thin divider line */}
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0px',
              right: '0px',
              height: '1px',
              backgroundColor: 'rgb(59, 58, 57)'
            }}
          />
          {/* Checkbox column header */}
          <div
            style={{
              padding: '10px 2px',
              boxSizing: 'border-box',
              borderTopLeftRadius: '12px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            role="columnheader"
            onMouseEnter={() => setHoveredHeader(true)}
            onMouseLeave={() => setHoveredHeader(false)}
          >
            <div
              style={{
                position: 'relative',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: hoveredHeader || selectedFiles.size > 0 ? 1 : 0,
                transition: 'opacity 0.1s ease'
              }}
            >
              <input
                type="checkbox"
                aria-label="Select all rows"
                checked={selectedFiles.size === items.length && items.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFiles(new Set(items.map(item => 
                      'isFolder' in item && item.isFolder ? (item as FolderItem).id : (item as BackendFile).file_id
                    )));
                  } else {
                    setSelectedFiles(new Set());
                  }
                }}
                style={{
                  position: 'absolute',
                  width: '24px',
                  height: '24px',
                  opacity: 0,
                  cursor: 'pointer',
                  zIndex: 2
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  width: '18px',
                  height: '18px',
                  border: '1px solid rgb(161, 159, 157)',
                  borderRadius: '50%',
                  backgroundColor: 'rgb(41, 40, 39)',
                  cursor: 'pointer',
                  zIndex: 1
                }}
              />
            </div>
          </div>
          {/* File type icon column header */}
          <div
            style={{
              padding: '10px 0px 10px 3px',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            role="columnheader"
            aria-label="Type"
          >
            <Document24Regular
              style={{
                color: 'rgb(200, 198, 196)',
                fontSize: '20px'
              }}
            />
          </div>
          {/* Name column header */}
          <div
            style={{
              padding: '6px 2px',
              boxSizing: 'border-box'
            }}
            role="columnheader"
          >
            <div
              style={{
                padding: '0 8px',
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgb(173, 173, 173)'
              }}
            >
              Name
            </div>
          </div>

          {/* Original location column header */}
          <div
            style={{
              padding: '6px 2px',
              boxSizing: 'border-box'
            }}
            role="columnheader"
          >
            <div
              style={{
                padding: '0 8px',
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgb(173, 173, 173)'
              }}
            >
              Original location
            </div>
          </div>

          {/* Date deleted column header */}
          <div
            style={{
              padding: '6px 2px',
              boxSizing: 'border-box',
              borderTopRightRadius: '12px'
            }}
            role="columnheader"
          >
            <div
              style={{
                padding: '0 8px',
                height: '35px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgb(173, 173, 173)'
              }}
            >
              Date deleted
            </div>
          </div>
        </div>

        {/* File/Folder rows */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '56px 40px 434px 300px 200px'
          }}
        >
          {items.map((item, index) => {
            const isLastRow = index === items.length - 1;
            const isFolder = 'isFolder' in item && item.isFolder;
            const itemId = isFolder ? (item as FolderItem).id : (item as BackendFile).file_id;
            const itemName = isFolder ? (item as FolderItem).name : (item as BackendFile).filename;
            const deletedDate = item.deleted_at ? formatDate(item.deleted_at) : (isFolder ? formatDate((item as FolderItem).created_at) : 'Unknown');
            
            // Helper to get file icon
            const getFileIcon = () => {
              if (isFolder) {
                return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/folder.svg';
              }
              const file = item as BackendFile;
              const type = file.file_type;
              if (type === 'image') {
                return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/photo.svg';
              } else if (type === 'document') {
                return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/docx.svg';
              } else if (type === 'video') {
                return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/video.svg';
              }
              return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/genericfile.svg';
            };
            
            return (
              <React.Fragment key={itemId}>
                <div
                  style={{
                    display: 'contents'
                  }}
                  role="row"
                  onMouseEnter={() => setHoveredRow(itemId)}
                  onMouseLeave={() => setHoveredRow(null)}
                  onClick={() => {
                    if (isFolder) {
                      setCurrentPath((item as FolderItem).folder_path);
                    }
                  }}
                >
                    {/* Checkbox cell */}
                    <div
                      style={{
                        padding: '10px 2px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(itemId)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === itemId
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        borderBottomLeftRadius: isLastRow ? '12px' : '0',
                        borderTopLeftRadius: selectedFiles.has(itemId) ? '8px' : '0',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedFiles.has(itemId)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset, rgb(41, 40, 39) 4px 0px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSelected = new Set(selectedFiles);
                        if (newSelected.has(itemId)) {
                          newSelected.delete(itemId);
                        } else {
                          newSelected.add(itemId);
                        }
                        setSelectedFiles(newSelected);
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: hoveredRow === itemId || selectedFiles.has(itemId) ? 1 : 0,
                          transition: 'opacity 0.1s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${itemName}`}
                          checked={selectedFiles.has(itemId)}
                          onChange={() => {}}
                          style={{
                            position: 'absolute',
                            width: '24px',
                            height: '24px',
                            opacity: 0,
                            cursor: 'pointer',
                            zIndex: 2
                          }}
                        />
                        <span
                          style={{
                            position: 'absolute',
                            width: '18px',
                            height: '18px',
                            border: '1px solid rgb(161, 159, 157)',
                            borderRadius: '50%',
                            backgroundColor: selectedFiles.has(itemId) ? 'rgb(71, 158, 245)' : 'rgb(41, 40, 39)',
                            cursor: 'pointer',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {selectedFiles.has(itemId) && (
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                              <path d="M9.76 3.2 4.8 8.16 2.24 5.6l.72-.72L4.8 6.72 9.04 2.48l.72.72Z" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </div>
                    {/* File type icon cell */}
                    <div
                      style={{
                        padding: '12px 0px 13px 3px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(itemId)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === itemId
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedFiles.has(itemId)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <img
                        src={getFileIcon()}
                        alt={isFolder ? 'folder' : (item as BackendFile).file_type}
                        style={{
                          width: '32px',
                          height: '32px'
                        }}

                      />
                    </div>
                    {/* Name cell */}
                    <div
                      style={{
                        padding: '12px 8px 13px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(itemId)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === itemId
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        boxShadow: selectedFiles.has(itemId)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
                        <div
                          style={{
                            fontSize: '14px',
                            color: 'rgb(255, 255, 255)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}
                        >
                          {itemName || 'Unknown'}
                          {isFolder && (
                            <span style={{ color: 'rgb(150, 150, 150)', marginLeft: '8px' }}>
                              ({(item as FolderItem).itemCount} {(item as FolderItem).itemCount === 1 ? 'item' : 'items'})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Original location cell */}
                    <div
                      style={{
                        padding: '12px 8px 13px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(itemId)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === itemId
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        boxShadow: selectedFiles.has(itemId)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <span style={{ color: 'rgb(200, 198, 196)', fontSize: '14px' }}>
                        My files
                      </span>
                    </div>

                    {/* Date deleted cell */}
                    <div
                      style={{
                        padding: '12px 8px 13px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(itemId)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === itemId
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        borderBottomRightRadius: isLastRow ? '12px' : '0',
                        borderTopRightRadius: selectedFiles.has(itemId) ? '8px' : '0',
                        position: 'relative',
                        transition: 'background-color 0.1s ease',
                        boxShadow: selectedFiles.has(itemId)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset, rgb(41, 40, 39) -4px 0px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <span style={{ color: 'rgb(200, 198, 196)', fontSize: '14px' }}>
                        {deletedDate}
                      </span>
                      {/* Divider line spanning all columns from left to right */}
                      {!isLastRow && !selectedFiles.has(itemId) && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: 'calc(-774px + 12px)',
                            right: '12px',
                            height: '1px',
                            backgroundColor: 'rgb(59, 58, 57)'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
        </div>
      </div>

      {/* Empty state - shown outside the table when no items */}
      {items.length === 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '80px 24px',
            minHeight: '400px'
          }}
        >
          <img
            src="https://res-1.cdn.office.net/files/sp-client/odsp-media-1e7b49f2/images/emptyfolder/empty_files_v3.webp"
            alt="Empty folder"
            style={{
              width: '240px',
              height: 'auto',
              marginBottom: '24px'
            }}
          />
          <div
            style={{
              fontSize: '17px',
              fontWeight: 400,
              color: 'rgb(200, 198, 196)',
              textAlign: 'center'
            }}
          >
            This folder is empty
          </div>
        </div>
      )}
    </div>
  );
};

export default RecycleBinView;
