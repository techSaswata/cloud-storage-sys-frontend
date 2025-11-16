'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useFiles } from '@/contexts/FilesContext';
import { BackendFile, getThumbnailUrl, getFileUrl, getDownloadUrl, deleteFile as apiDeleteFile } from '@/lib/apiService';
import { Document24Regular } from '@fluentui/react-icons';

interface MyFilesViewProps {
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  selectedFiles: Set<string>;
  setSelectedFiles: (files: Set<string>) => void;
  currentPath?: string;
  setCurrentPath?: (path: string) => void;
}

interface FolderItem {
  id: string;
  name: string;
  isFolder: true;
  itemCount: number;
  created_at: string;
  folder_path: string;
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

// Helper function to get file icon based on type
function getFileIcon(file: BackendFile | FolderItem): string {
  if ('isFolder' in file && file.isFolder) {
    return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/folder.svg';
  }
  
  const backendFile = file as BackendFile;
  const type = backendFile.file_type;
  const ext = backendFile.filename?.split('.').pop()?.toLowerCase() || '';
  
  if (type === 'image') {
    return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/photo.svg';
  } else if (type === 'video') {
    return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/video.svg';
  } else if (type === 'audio') {
    return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/audio.svg';
  } else if (type === 'document') {
    if (ext === 'pdf') {
      return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/pdf.svg';
    } else if (ext === 'docx' || ext === 'doc') {
      return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/word_32x1.svg';
    } else if (ext === 'txt') {
      return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/txt.svg';
    }
  } else if (type === 'code') {
    return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/code.svg';
  }
  
  // Default generic file icon
  return 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/genericfile.svg';
}

const MyFilesView: React.FC<MyFilesViewProps> = ({ 
  currentFolderId, 
  setCurrentFolderId, 
  selectedFiles, 
  setSelectedFiles,
  currentPath: propCurrentPath,
  setCurrentPath: propSetCurrentPath
}) => {
  const { files: allFiles, loading, refreshFiles } = useFiles();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [hoveredHeader, setHoveredHeader] = useState(false);
  const [internalCurrentPath, setInternalCurrentPath] = useState<string>(''); // Fallback internal state
  
  // Use prop if provided, otherwise use internal state
  const currentPath = propCurrentPath !== undefined ? propCurrentPath : internalCurrentPath;
  const setCurrentPath = propSetCurrentPath || setInternalCurrentPath;

  // Compute folders and files for current path
  const { folders, filesInCurrentFolder } = useMemo(() => {
    // Get unique folders at current path level (virtual folders from file paths)
    const folderSet = new Map<string, { count: number; created_at: string }>();
    const filesHere: BackendFile[] = [];
    const actualFolders: BackendFile[] = []; // Actual folder entries from backend

    allFiles.forEach(file => {
      // Check if this is an actual folder entry from backend
      if (file.isFolder || file.file_type === 'folder') {
        const folderPathInFile = file.folder_path || '';
        // Only include if it's at the current level
        if (folderPathInFile === currentPath) {
          actualFolders.push(file);
        }
        return; // Skip folder entries from the virtual folder logic
      }

      const filePath = file.folder_path || '';
      
      // If file is in current path or its subfolder
      if (currentPath === '') {
        // At root level
        if (!filePath) {
          // File is at root
          filesHere.push(file);
        } else {
          // File is in a folder, extract first level folder name
          const firstFolder = filePath.split('/')[0];
          if (firstFolder) {
            const existing = folderSet.get(firstFolder);
            if (!existing || new Date(file.created_at) > new Date(existing.created_at)) {
              folderSet.set(firstFolder, { 
                count: (existing?.count || 0) + 1,
                created_at: file.created_at 
              });
            } else {
              folderSet.set(firstFolder, { 
                count: existing.count + 1,
                created_at: existing.created_at 
              });
            }
          }
        }
      } else {
        // In a specific folder
        if (filePath === currentPath) {
          // File is directly in current folder
          filesHere.push(file);
        } else if (filePath.startsWith(currentPath + '/')) {
          // File is in a subfolder
          const relativePath = filePath.substring(currentPath.length + 1);
          const nextFolder = relativePath.split('/')[0];
          if (nextFolder) {
            const existing = folderSet.get(nextFolder);
            if (!existing || new Date(file.created_at) > new Date(existing.created_at)) {
              folderSet.set(nextFolder, { 
                count: (existing?.count || 0) + 1,
                created_at: file.created_at 
              });
            } else {
              folderSet.set(nextFolder, { 
                count: existing.count + 1,
                created_at: existing.created_at 
              });
            }
          }
        }
      }
    });

    // Convert folder set to array (virtual folders)
    const virtualFolders: FolderItem[] = Array.from(folderSet.entries()).map(([name, data]) => ({
      id: `folder_${currentPath}/${name}`,
      name,
      isFolder: true as const,
      itemCount: data.count,
      created_at: data.created_at,
      folder_path: currentPath ? `${currentPath}/${name}` : name
    }));

    // Combine actual folders (from backend) with virtual folders (from file paths)
    // But deduplicate: if a backend folder exists with the same name, skip the virtual folder
    const actualFolderNames = new Set(
      actualFolders.map(f => f.filename)
    );
    
    const uniqueVirtualFolders = virtualFolders.filter(
      vf => !actualFolderNames.has(vf.name)
    );
    
    // Merge backend folders with item counts from virtual folders
    const mergedActualFolders = actualFolders.map(folder => {
      const virtualMatch = virtualFolders.find(vf => vf.name === folder.filename);
      if (virtualMatch) {
        // Add itemCount to the actual folder
        return { ...folder, itemCount: virtualMatch.itemCount };
      }
      return { ...folder, itemCount: 0 };
    });
    
    const allFolders = [...mergedActualFolders, ...uniqueVirtualFolders];

    return {
      folders: allFolders,
      filesInCurrentFolder: filesHere
    };
  }, [allFiles, currentPath]);

  // Combined list of folders and files
  const items = [...folders, ...filesInCurrentFolder];

  const handleItemClick = async (item: BackendFile | FolderItem) => {
    // Check if it's a folder
    if ('isFolder' in item && item.isFolder) {
      // Navigate into folder
      // For backend folders: construct path from folder_path + filename
      // For virtual folders: use the folder_path property
      let targetPath: string;
      if ('file_id' in item) {
        // Backend folder - construct full path
        const parentPath = item.folder_path || '';
        const folderName = (item as BackendFile).filename;
        targetPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      } else {
        // Virtual folder - use existing folder_path
        targetPath = (item as FolderItem).folder_path;
      }
      setCurrentPath(targetPath);
      return;
    }

    // It's a file
    const file = item as BackendFile;
    try {
      // For documents (stored as .gz), use download endpoint with download=false
      // This decompresses and serves with inline disposition for viewing
      if (file.file_type === 'document') {
        const viewUrl = getDownloadUrl(file.file_id, false);
        window.open(viewUrl, '_blank');
      } else {
        // For media (images/videos/audio), use direct Supabase URL
        const urlData = await getFileUrl(file.file_id, 3600);
        window.open(urlData.url, '_blank');
      }
    } catch (err) {
      console.error('Failed to open file:', err);
      alert('Failed to open file');
    }
  };

  const handleDelete = async (itemId: string) => {
    // Check if it's a folder or a file
    const item = items.find(i => {
      const isFolder = 'isFolder' in i && i.isFolder;
      const iId = isFolder 
        ? ('id' in i ? i.id : (i as BackendFile).file_id)
        : (i as BackendFile).file_id;
      return iId === itemId;
    });
    
    if (!item) return;
    
    const isFolder = 'isFolder' in item && item.isFolder;
    
    if (isFolder) {
      // It's a folder - delete all files in this folder and the folder itself
      // Calculate the full folder path
      let folderPath: string;
      if ('file_id' in item) {
        // Backend folder - construct full path
        const parentPath = item.folder_path || '';
        const folderName = (item as BackendFile).filename;
        folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
      } else {
        // Virtual folder - use existing folder_path
        folderPath = (item as FolderItem).folder_path;
      }
      
      const filesToDelete = allFiles.filter(file => {
        const fileFolderPath = file.folder_path || '';
        return fileFolderPath === folderPath || fileFolderPath.startsWith(folderPath + '/');
      });
      
      // If it's a backend folder, also delete the folder entry itself
      if ('file_id' in item) {
        filesToDelete.push(item as BackendFile);
      }
      
      const confirmMessage = `Are you sure you want to move this folder and all ${filesToDelete.length} file(s) inside to recycle bin?`;
      if (confirm(confirmMessage)) {
        try {
          // Delete all files in the folder
          for (const file of filesToDelete) {
            await apiDeleteFile(file.file_id);
          }
          refreshFiles();
          console.log(`✓ Folder and ${filesToDelete.length} file(s) moved to recycle bin`);
        } catch (err) {
          console.error('Failed to delete folder:', err);
          alert('Failed to delete folder');
        }
      }
    } else {
      // It's a file
      if (confirm('Are you sure you want to move this file to recycle bin?')) {
        try {
          await apiDeleteFile(itemId);
          refreshFiles();
          console.log('✓ File moved to recycle bin');
        } catch (err) {
          console.error('Failed to delete file:', err);
          alert('Failed to delete file');
        }
      }
    }
  };

  const handleBreadcrumbClick = (path: string) => {
    setCurrentPath(path);
  };

  // Generate breadcrumbs
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [{ name: 'My files', path: '' }];
    
    const parts = currentPath.split('/');
    const crumbs = [{ name: 'My files', path: '' }];
    
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/');
      crumbs.push({ name: part, path });
    });
    
    return crumbs;
  }, [currentPath]);

  if (loading) {
    return (
      <div className="mt-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading files...</div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Breadcrumb navigation */}
      {currentPath && (
        <div style={{
          marginBottom: '16px',
          fontSize: '14px',
          color: 'rgb(200, 198, 196)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <button
                onClick={() => handleBreadcrumbClick(crumb.path)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: index === breadcrumbs.length - 1 ? 'rgb(255, 255, 255)' : 'rgb(71, 158, 245)',
                  cursor: index === breadcrumbs.length - 1 ? 'default' : 'pointer',
                  padding: 0,
                  fontSize: '14px',
                  textDecoration: index === breadcrumbs.length - 1 ? 'none' : 'none',
                  fontWeight: index === breadcrumbs.length - 1 ? 600 : 400
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
      )}

      {/* Conditional rendering: Show table only if items exist, otherwise show empty state */}
      {items.length > 0 ? (
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
          {/* Table header row with 6 columns (checkbox + icon + 4 columns) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 40px 434px 200px 200px 260px',
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
                  // Select all items (folders and files)
                  const allIds = items.map(item => {
                    const isFolder = 'isFolder' in item && item.isFolder;
                    return isFolder ? (item as FolderItem).id : (item as BackendFile).file_id;
                  });
                  setSelectedFiles(new Set(allIds));
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

            {/* Modified column header */}
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
                Modified
              </div>
            </div>

            {/* File size column header */}
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
                File size
              </div>
            </div>

            {/* Sharing column header */}
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
                Type
              </div>
            </div>
          </div>

          {/* File/Folder rows */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 40px 434px 200px 200px 260px'
            }}
          >
            {items.map((item, index) => {
              const isLastRow = index === items.length - 1;
              const isFolder = 'isFolder' in item && item.isFolder;
              // For folders: use 'id' if it's a virtual folder, or 'file_id' if it's a backend folder
              const itemId = isFolder 
                ? ('id' in item ? item.id : (item as BackendFile).file_id)
                : (item as BackendFile).file_id;
              const itemName = isFolder 
                ? ('name' in item ? item.name : (item as BackendFile).filename)
                : (item as BackendFile).filename;
              
              return (
                <React.Fragment key={itemId}>
                  <div
                    style={{
                      display: 'contents'
                    }}
                    role="row"
                    onMouseEnter={() => setHoveredRow(itemId)}
                    onMouseLeave={() => setHoveredRow(null)}
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
                        src={getFileIcon(item)}
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
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', paddingLeft: '8px', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <button
                              style={{
                                fontSize: '14px',
                                color: 'rgb(255, 255, 255)',
                                textAlign: 'left',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%'
                              }}
                              onClick={() => {
                                // Single click for folders, double click for files
                                if (isFolder) {
                                  handleItemClick(item);
                                }
                              }}
                              onDoubleClick={() => {
                                if (!isFolder) {
                                  handleItemClick(item);
                                }
                              }}
                            >
                              {itemName}
                            </button>
                            <div
                              style={{
                                fontSize: '12px',
                                color: 'rgb(153, 153, 153)',
                                marginTop: '1px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {currentPath ? currentPath : 'My files'}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons - show on hover */}
                        {hoveredRow === itemId && (
                          <div style={{ display: 'flex', gap: '1px', alignItems: 'center', paddingRight: '8px' }}>
                            {/* More options button */}
                            <button
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: openDropdown === itemId ? 'rgb(61, 60, 59)' : 'transparent',
                                color: 'rgb(200, 198, 196)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.1s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (openDropdown !== itemId) {
                                  e.currentTarget.style.backgroundColor = 'rgb(61, 60, 59)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (openDropdown !== itemId) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = e.currentTarget.getBoundingClientRect();
                                setDropdownPosition({
                                  top: rect.bottom + 5,
                                  left: rect.left
                                });
                                setOpenDropdown(openDropdown === itemId ? null : itemId);
                              }}
                              title="Show more"
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="3" cy="8" r="1.5"/>
                                <circle cx="8" cy="8" r="1.5"/>
                                <circle cx="13" cy="8" r="1.5"/>
                              </svg>
                            </button>

                            {/* Share button */}
                            <button
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                color: 'rgb(200, 198, 196)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.1s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(61, 60, 59)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              onClick={(e) => {
                                e.stopPropagation();
                                // Share action
                              }}
                              title="Share"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10.25 3a.75.75 0 0 1 0 1.5h-3.5c-1.24 0-2.25 1-2.25 2.25v10.5l.01.23a2.25 2.25 0 0 0 2.24 2.02h10.5c1.24 0 2.25-1 2.25-2.25v-2a.75.75 0 0 1 1.5 0v2A3.75 3.75 0 0 1 17.25 21H6.75c-2 0-3.64-1.58-3.75-3.56V6.75A3.75 3.75 0 0 1 6.75 3h3.5Zm4.69-.93a.75.75 0 0 1 .8.11l7 6a.75.75 0 0 1 .03 1.11l-7 6.75a.75.75 0 0 1-1.27-.54v-2.98a7.24 7.24 0 0 0-2.94.77 11.43 11.43 0 0 0-3.69 3.3l-.27.36a.75.75 0 0 1-1.35-.45c0-2.86.69-5.59 2.17-7.63a8 8 0 0 1 6.08-3.34V2.65c.04-.26.2-.47.44-.58ZM16 6.25c0 .41-.34.75-.75.75a6.6 6.6 0 0 0-5.62 2.75 10.23 10.23 0 0 0-1.72 4.5A9.23 9.23 0 0 1 15.24 11a.75.75 0 0 1 .76.75v1.98l5.13-4.95L16 4.38v1.87Z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Modified cell */}
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
                      <span>{formatDate(item.created_at)}</span>
                    </div>

                    {/* File size cell */}
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
                      <span>{isFolder ? `${(item as FolderItem).itemCount || 0} items` : formatFileSize((item as BackendFile).file_size)}</span>
                    </div>

                    {/* Type cell */}
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
                      {/* Divider line spanning all columns from left to right */}
                      {!isLastRow && !selectedFiles.has(itemId) && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: 'calc(-930px + 12px)',
                            right: '12px',
                            height: '1px',
                            backgroundColor: 'rgb(59, 58, 57)'
                          }}
                        />
                      )}
                      <span style={{ textTransform: 'capitalize' }}>{isFolder ? 'Folder' : (item as BackendFile).file_type}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
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
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'rgb(243, 242, 241)',
              marginTop: '8px',
              marginBottom: '24px'
            }}
          >
            This folder is empty
          </div>
          <img
            src="https://res-1.cdn.office.net/files/sp-client/odsp-media-38d8b5f2/images/emptyfolder/empty_files_v3_dark.webp"
            alt="Empty folder"
            style={{
              width: '256px',
              height: '256px',
              marginBottom: '16px'
            }}
          />
          <div
            style={{
              fontSize: '12px',
              color: 'rgb(161, 159, 157)',
              textAlign: 'center'
            }}
          >
            Drag and drop files here to access them from any device.
          </div>
        </div>
      )}

      {/* Fixed position dropdown menu */}
      {openDropdown && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999
            }}
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(null);
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              backgroundColor: 'rgb(46, 46, 46)',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
              minWidth: '200px',
              zIndex: 1000,
              overflow: 'hidden'
            }}
          >
            <button
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'rgb(255, 255, 255)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                textAlign: 'left',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(56, 56, 56)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={(e) => {
                e.stopPropagation();
                const item = items.find(f => {
                  const isFolder = 'isFolder' in f && f.isFolder;
                  const fId = isFolder 
                    ? ('id' in f ? f.id : (f as BackendFile).file_id)
                    : (f as BackendFile).file_id;
                  return fId === openDropdown;
                });
                if (item) {
                  handleItemClick(item);
                }
                setOpenDropdown(null);
              }}
            >
              <span>Open</span>
            </button>
            <button
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'rgb(255, 99, 71)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '14px',
                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                textAlign: 'left',
                transition: 'background-color 0.1s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(56, 56, 56)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={(e) => {
                e.stopPropagation();
                if (openDropdown) {
                  handleDelete(openDropdown);
                }
                setOpenDropdown(null);
              }}
            >
              <span>Delete</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MyFilesView;
