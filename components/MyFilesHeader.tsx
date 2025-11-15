'use client';

import React, { useState } from 'react';
import './MyFilesHeader.css';
import {
  Share16Regular,
  Link16Regular,
  Delete16Regular,
  ArrowDownload16Regular,
  FolderArrowRight16Regular,
  Copy16Regular,
  Rename16Regular,
  TextSortAscending16Regular,
  ChevronDown12Regular,
  Dismiss12Regular,
  LineHorizontal320Regular,
  PanelRight16Regular
} from '@fluentui/react-icons';
import { moveFiles, copyFiles, updateFile, getAllFiles, getFileById } from '@/lib/fileStore';
import { getDownloadUrl, deleteFile, BackendFile } from '@/lib/apiService';
import { useFiles } from '@/contexts/FilesContext';
import UploadStatusPopup, { type OperationType } from './UploadStatusPopup';

interface MyFilesHeaderProps {
  isInsideFolder?: boolean;
  selectedCount?: number;
  onClearSelection?: () => void;
  selectedFiles?: Set<string>;
  currentFolderId?: string | null;
  allFiles?: BackendFile[]; // Add this to access all files for folder deletion
}

const MyFilesHeader: React.FC<MyFilesHeaderProps> = ({
  isInsideFolder = false,
  selectedCount = 0,
  onClearSelection,
  selectedFiles = new Set(),
  currentFolderId = null,
  allFiles = []
}) => {
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'move' | 'copy'>('move');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [statusOperation, setStatusOperation] = useState<OperationType | null>(null);
  const [statusItemName, setStatusItemName] = useState('');
  const [statusCount, setStatusCount] = useState(1);
  const { refreshFiles } = useFiles();

  const handleDelete = async () => {
    if (selectedFiles.size === 0) return;

    const selectedIds = Array.from(selectedFiles);
    const filesToDelete: string[] = [];
    
    // Process each selected item
    for (const itemId of selectedIds) {
      // Check if it's a folder (ID starts with 'folder_')
      if (itemId.startsWith('folder_')) {
        // It's a folder - extract the folder path
        // folder ID format: 'folder_/path' or 'folder_path/to/folder'
        let folderPath = itemId.substring('folder_'.length);  // Remove 'folder_' prefix
        // If it starts with '/', remove that too (happens when at root level)
        if (folderPath.startsWith('/')) {
          folderPath = folderPath.substring(1);
        }
        
        // Find all files in this folder and subfolders
        const filesInFolder = allFiles.filter(file => {
          const fileFolderPath = file.folder_path || '';
          return fileFolderPath === folderPath || fileFolderPath.startsWith(folderPath + '/');
        });
        
        // Add file IDs to deletion list
        filesInFolder.forEach(file => filesToDelete.push(file.file_id));
      } else {
        // It's a regular file
        filesToDelete.push(itemId);
      }
    }
    
    if (filesToDelete.length === 0) {
      alert('No files to delete');
      return;
    }

    const confirmMessage = filesToDelete.length === 1 
      ? 'Are you sure you want to move this file to recycle bin?'
      : `Are you sure you want to move ${filesToDelete.length} file(s) to recycle bin?`;

    if (!confirm(confirmMessage)) return;

    setStatusCount(filesToDelete.length);
    setStatusOperation('deleting-file');

    try {
      // Delete each file (soft delete - moves to recycle bin)
      for (const fileId of filesToDelete) {
        await deleteFile(fileId);
      }

      setStatusOperation('file-deleted');
      onClearSelection?.();
      
      // Refresh the file list
      await refreshFiles();
      
      console.log(`✓ ${filesToDelete.length} file(s) moved to recycle bin`);

      // Auto-hide after showing success
      setTimeout(() => {
        setStatusOperation(null);
      }, 3000);
    } catch (err) {
      console.error('Failed to delete files:', err);
      alert('Failed to delete files');
      setStatusOperation(null);
    }
  };

  const handleDownload = () => {
    if (selectedFiles.size === 0) return;
    
    // Download each selected file using backend API
    selectedFiles.forEach((fileId, index) => {
      // Use backend API download endpoint with download=true
      // This forces download (Content-Disposition: attachment)
      // - Gets real extension from metadata
      // - Downloads from Supabase
      // - Serves with correct filename and extension
      const downloadUrl = getDownloadUrl(fileId, true);
      
      // Small delay between downloads to avoid browser blocking
      setTimeout(() => {
        window.open(downloadUrl, '_blank');
      }, Number(index) * 200); // 200ms delay between each download
    });
  };

  const handleMoveTo = () => {
    setPickerMode('move');
    setShowFolderPicker(true);
  };

  const handleCopyTo = () => {
    setPickerMode('copy');
    setShowFolderPicker(true);
  };

  const handleRename = () => {
    if (selectedFiles.size !== 1) {
      alert('Please select exactly one item to rename');
      return;
    }
    const fileId = Array.from(selectedFiles)[0];
    const file = getFileById(fileId);
    if (file) {
      const newName = prompt('Enter new name:', file.name);
      if (newName && newName !== file.name) {
        updateFile(fileId, { name: newName });
        onClearSelection?.();
      }
    }
  };

  const selectFolder = (folderId: string | null) => {
    if (selectedFiles.size === 0) return;
    const fileIds = Array.from(selectedFiles);

    if (pickerMode === 'move') {
      moveFiles(fileIds, folderId);
    } else {
      copyFiles(fileIds, folderId);
    }

    setShowFolderPicker(false);
    onClearSelection?.();
  };

  if (selectedCount > 0) {
    // Selection mode - full width command bar
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '64px',
        marginTop: '30px',
        padding: '0 16px',
        backgroundColor: 'rgb(41, 40, 39)',
        borderRadius: '8px',
        boxShadow: 'rgba(0, 0, 0, 0.133) 0px 3.2px 7.2px 0px, rgba(0, 0, 0, 0.11) 0px 0.6px 1.8px 0px',
        fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif'
      }}>
        {/* Left side - Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          {/* Share Button */}
          <button
            type="button"
            className="commandbar-item"
            title="Share"
            style={{ marginLeft: '8px' }}
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <Share16Regular />
              </i>
              <span className="commandbar-text">Share</span>
            </span>
          </button>

          {/* Copy Link Button */}
          <button
            type="button"
            className="commandbar-item"
            title="Copy link"
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <Link16Regular />
              </i>
              <span className="commandbar-text">Copy link</span>
            </span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            className="commandbar-item"
            title="Delete"
            onClick={handleDelete}
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <Delete16Regular />
              </i>
              <span className="commandbar-text">Delete</span>
            </span>
          </button>

          {/* Download Button */}
          <button
            type="button"
            className="commandbar-item"
            title="Download"
            onClick={handleDownload}
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <ArrowDownload16Regular />
              </i>
              <span className="commandbar-text">Download</span>
            </span>
          </button>

          {/* Move to Button */}
          <button
            type="button"
            className="commandbar-item"
            title="Move to"
            onClick={handleMoveTo}
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <FolderArrowRight16Regular />
              </i>
              <span className="commandbar-text">Move to</span>
            </span>
          </button>

          {/* Copy to Button */}
          <button
            type="button"
            className="commandbar-item"
            title="Copy to"
            onClick={handleCopyTo}
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <Copy16Regular />
              </i>
              <span className="commandbar-text">Copy to</span>
            </span>
          </button>

          {/* Rename Button */}
          <button
            type="button"
            className="commandbar-item"
            title="Rename"
            onClick={handleRename}
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <Rename16Regular />
              </i>
              <span className="commandbar-text">Rename</span>
            </span>
          </button>
        </div>

        {/* Right side - Secondary commands */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          {/* Sort Button */}
          <button
            type="button"
            className="commandbar-item"
            aria-label="Sort all items by"
            title="Sort all items by"
            aria-haspopup="menu"
            aria-expanded="false"
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <TextSortAscending16Regular />
              </i>
              <span className="commandbar-text">Sort</span>
              <i className="commandbar-chevron" aria-hidden="true">
                <ChevronDown12Regular />
              </i>
            </span>
          </button>

          {/* Clear Selection Button - positioned between Sort and View Options */}
          <button
            type="button"
            className="commandbar-item"
            title={`${selectedCount} selected`}
            onClick={onClearSelection}
            style={{
              border: '1px solid rgb(72, 70, 68)',
              borderRadius: '20px',
              padding: '0 10px 0 8px',
              margin: '0 25px 0 0',
              position: 'relative'
            }}
          >
            <span className="commandbar-item-container" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Dismiss12Regular style={{ margin: '0 4px' }} />
              <span className="commandbar-text" style={{ whiteSpace: 'nowrap', margin: '0 4px' }}>{selectedCount} selected</span>
            </span>
            {/* Vertical separator on the right */}
            <div style={{
              position: 'absolute',
              right: '-17px',
              top: '4px',
              bottom: '2px',
              width: '1px',
              height: '24px',
              backgroundColor: 'rgb(59, 58, 57)'
            }} />
          </button>

          {/* View Options Button */}
          <button
            type="button"
            className="commandbar-item"
            aria-label="Switch view options"
            title="Switch view options"
            aria-haspopup="menu"
            aria-expanded="false"
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <LineHorizontal320Regular />
              </i>
              <i className="commandbar-chevron" aria-hidden="true">
                <ChevronDown12Regular />
              </i>
            </span>
          </button>

          {/* Details Button */}
          <button
            type="button"
            className="commandbar-item"
            aria-label="Open the details pane"
            title="Open the details pane"
          >
            <span className="commandbar-item-container">
              <i className="commandbar-icon" aria-hidden="true">
                <PanelRight16Regular />
              </i>
              <span className="commandbar-text">Details</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // Normal mode (no selection)
  return (
    <div className="my-files-header">
      {/* Left side - Title or Command Buttons */}
      <div className="my-files-title-section">
        <div className="my-files-title-content">
          {!isInsideFolder ? (
            <div className="my-files-title-wrapper">
              <h2 className="my-files-title">My files</h2>
            </div>
          ) : (
            <div className="my-files-commandbar-wrapper">
              <div className="my-files-commandbar-inner" role="menubar">
                <span className="commandbar-main">
                  {/* Share Button */}
                  <button
                    type="button"
                    role="menuitem"
                    className="commandbar-item"
                    title="Share"
                  >
                    <span className="commandbar-item-container">
                      <i className="commandbar-icon" aria-hidden="true">
                        <Share16Regular />
                      </i>
                      <span className="commandbar-text">Share</span>
                    </span>
                  </button>

                  {/* Copy Link Button */}
                  <button
                    type="button"
                    role="menuitem"
                    className="commandbar-item"
                    title="Copy link"
                  >
                    <span className="commandbar-item-container">
                      <i className="commandbar-icon" aria-hidden="true">
                        <Link16Regular />
                      </i>
                      <span className="commandbar-text">Copy link</span>
                    </span>
                  </button>

                  {/* Download Button */}
                  <button
                    type="button"
                    role="menuitem"
                    className="commandbar-item"
                    title="Download"
                  >
                    <span className="commandbar-item-container">
                      <i className="commandbar-icon" aria-hidden="true">
                        <ArrowDownload16Regular />
                      </i>
                      <span className="commandbar-text">Download</span>
                    </span>
                  </button>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Command Bar */}
      <div className="my-files-actions">
        <div className="my-files-commandbar">
          <div className="my-files-commandbar-wrapper">
            <div className="my-files-commandbar-inner" role="menubar">
              {/* Empty space for primary commands */}
              <span className="commandbar-main"></span>

              {/* Secondary commands */}
              <span className="commandbar-right">
                {/* Sort Button */}
                <button
                  type="button"
                  role="menuitem"
                  className="commandbar-item"
                  aria-label="Sort all items by"
                  title="Sort all items by"
                  aria-haspopup="menu"
                  aria-expanded="false"
                >
                  <span className="commandbar-item-container">
                    <i className="commandbar-icon" aria-hidden="true">
                      <TextSortAscending16Regular />
                    </i>
                    <span className="commandbar-text">Sort</span>
                    <i className="commandbar-chevron" aria-hidden="true">
                      <ChevronDown12Regular />
                    </i>
                  </span>
                </button>

                {/* View Options Button */}
                <button
                  type="button"
                  role="menuitem"
                  className="commandbar-item"
                  aria-label="Switch view options"
                  title="Switch view options"
                  aria-haspopup="menu"
                  aria-expanded="false"
                >
                  <span className="commandbar-item-container">
                    <i className="commandbar-icon" aria-hidden="true">
                      <LineHorizontal320Regular />
                    </i>
                    <i className="commandbar-chevron" aria-hidden="true">
                      <ChevronDown12Regular />
                    </i>
                  </span>
                </button>

                {/* Details Button */}
                <button
                  type="button"
                  role="menuitem"
                  className="commandbar-item"
                  aria-label="Open the details pane"
                  title="Open the details pane"
                >
                  <span className="commandbar-item-container">
                    <i className="commandbar-icon" aria-hidden="true">
                      <PanelRight16Regular />
                    </i>
                    <span className="commandbar-text">Details</span>
                  </span>
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Folder Picker Modal */}
      {showFolderPicker && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1000
            }}
            onClick={() => setShowFolderPicker(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgb(41, 40, 39)',
              borderRadius: '8px',
              padding: '24px',
              minWidth: '400px',
              maxHeight: '500px',
              overflow: 'auto',
              zIndex: 1001,
              fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif'
            }}
          >
            <h3 style={{ color: 'rgb(243, 242, 241)', marginBottom: '16px' }}>
              {pickerMode === 'move' ? 'Move to' : 'Copy to'}
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => selectFolder(null)}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'rgb(51, 50, 49)',
                  color: 'rgb(243, 242, 241)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginBottom: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(61, 60, 59)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
              >
                My files (Root)
              </button>
              {getAllFiles()
                .filter(f => f.isFolder)
                .map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => selectFolder(folder.id)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      backgroundColor: 'rgb(51, 50, 49)',
                      color: 'rgb(243, 242, 241)',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(61, 60, 59)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(51, 50, 49)'}
                  >
                    {folder.name}
                  </button>
                ))}
            </div>
            <button
              onClick={() => setShowFolderPicker(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgb(71, 158, 245)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Status Popup */}
      {statusOperation && (
        <UploadStatusPopup
          operation={statusOperation}
          itemName={statusItemName}
          count={statusCount}
          onClose={() => {
            setStatusOperation(null);
            setStatusItemName('');
            setStatusCount(1);
          }}
          onSeeDetails={() => {
            console.log('See details clicked');
          }}
        />
      )}
    </div>
  );
};

export default MyFilesHeader;
