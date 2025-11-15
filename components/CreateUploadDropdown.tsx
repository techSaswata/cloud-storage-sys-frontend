'use client';

import { useRef, useState, useEffect } from 'react';
import { useFileUpload } from '@/lib/useFileUpload';
import UploadStatusPopup, { type OperationType } from './UploadStatusPopup';
import { createFolder as apiCreateFolder } from '@/lib/apiService';
import { useFiles } from '@/contexts/FilesContext';
import { DocumentArrowUp20Regular, FolderArrowUp20Regular } from '@fluentui/react-icons';

interface CreateUploadDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position?: { top: number; left: number };
  currentPath?: string;
}

const CreateUploadDropdown = ({ isOpen, onClose, position, currentPath = '' }: CreateUploadDropdownProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const { uploadMultipleFiles, progress, uploading } = useFileUpload(currentPath);
  const { refreshFiles } = useFiles();
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [uploadOperation, setUploadOperation] = useState<OperationType | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Watch for upload progress changes
  useEffect(() => {
    if (progress) {
      setUploadOperation('uploading');
      setCurrentFileName(progress.fileName);
    }
  }, [progress]);

  // Watch for upload completion
  useEffect(() => {
    if (!uploading && uploadOperation === 'uploading') {
      setUploadOperation('upload-done');
      // Reset after a delay
      setTimeout(() => {
        setUploadOperation(null);
        setCurrentFileName('');
      }, 6000);
    }
  }, [uploading, uploadOperation]);

  const handleFileUpload = async (files: FileList | null) => {
    console.log('handleFileUpload called with files:', files);
    if (!files || files.length === 0) {
      console.log('No files selected');
      return;
    }

    console.log('Starting upload process...');
    await uploadMultipleFiles(files);
    console.log('Upload process completed');

    // Dispatch custom event to update RecentFiles
    window.dispatchEvent(new Event('filesUpdated'));
  };

  const menuItems = [
    {
      id: 'folder',
      label: 'Folder',
      icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/folder.svg',
      iconAlt: 'folder'
    },
    { type: 'divider' },
    {
      id: 'files-upload',
      label: 'Files upload',
      svgIcon: 'DocumentArrowUpRegular'
    },
    {
      id: 'folder-upload',
      label: 'Folder upload',
      svgIcon: 'FolderArrowUpRegular'
    },
    { type: 'divider' },
    {
      id: 'word',
      label: 'Word document',
      icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/docx.svg',
      iconAlt: 'docx'
    },
    {
      id: 'excel',
      label: 'Excel workbook',
      icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/xlsx.svg',
      iconAlt: 'xlsx'
    },
    {
      id: 'powerpoint',
      label: 'PowerPoint presentation',
      icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/pptx.svg',
      iconAlt: 'pptx'
    },
    {
      id: 'onenote',
      label: 'OneNote notebook',
      icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/onetoc.svg',
      iconAlt: 'onetoc'
    },
    {
      id: 'excel-survey',
      label: 'Excel survey',
      icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/xlsx.svg',
      iconAlt: 'xlsx'
    },
    {
      id: 'text',
      label: 'Text Document',
      icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/txt.svg',
      iconAlt: 'txt'
    }
  ];

  return (
    <>
      {/* Hidden file inputs - ALWAYS rendered */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          console.log('File input onChange triggered');
          handleFileUpload(e.target.files);
        }}
        accept="*/*"
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          console.log('Folder input onChange triggered');
          handleFileUpload(e.target.files);
        }}
        {...({ webkitdirectory: '', directory: '' } as any)}
      />

      {isOpen && (
        <>
          {/* Backdrop to close dropdown when clicking outside */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998
            }}
            onClick={onClose}
          />

          {/* Dropdown menu */}
          <div
            style={{
              position: 'fixed',
              top: position?.top || 100,
              left: position?.left || 100,
              width: '250px',
              minWidth: '180px',
              padding: '4px',
              borderRadius: '8px',
              backgroundColor: 'rgb(41, 41, 41)',
              fontFamily: '"Segoe UI", "Segoe UI Web (West European)", "Segoe UI", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
              fontSize: '14px',
              color: 'rgb(243, 242, 241)',
              zIndex: 9999,
              boxShadow: '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.432), 0 1.2px 3.6px 0 rgba(0, 0, 0, 0.308)',
              animation: 'menuExpandContentsAnimation 0.3s cubic-bezier(0.1, 0.9, 0.2, 1)'
            }}
          >
            <ul
              role="presentation"
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0
              }}
            >
              {menuItems.map((item, index) => {
                if (item.type === 'divider') {
                  return (
                    <li
                      key={`divider-${index}`}
                      role="separator"
                      aria-hidden="true"
                      style={{
                        height: '1px',
                        margin: '4px',
                        backgroundColor: 'transparent',
                        borderTop: '1px solid transparent'
                      }}
                    />
                  );
                }

                return (
                  <li
                    key={item.id}
                    role="presentation"
                    title={item.label}
                    style={{
                      position: 'relative',
                      width: '242px',
                      height: '36px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <button
                      title={item.label}
                      role="menuitem"
                      tabIndex={index === 0 ? 0 : -1}
                      style={{
                        display: 'block',
                        position: 'relative',
                        width: '242px',
                        height: '36px',
                        boxSizing: 'border-box',
                        padding: '0 8px 0 4px',
                        border: 'none',
                        borderRadius: '4px',
                        fontFamily: '"Segoe UI", "Segoe UI Web (West European)", "Segoe UI", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                        fontSize: '14px',
                        lineHeight: '36px',
                        textAlign: 'left',
                        color: 'rgb(214, 214, 214)',
                        backgroundColor: 'rgb(41, 41, 41)',
                        cursor: 'pointer',
                        transition: 'all 0.1s',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(50, 50, 50)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgb(41, 41, 41)';
                      }}
                      onClick={() => {
                        console.log(`Menu item clicked: ${item.id}`);
                        if (item.id === 'folder') {
                          setShowFolderDialog(true);
                          onClose();
                        } else if (item.id === 'files-upload') {
                          console.log('Triggering file input click');
                          console.log('File input ref:', fileInputRef.current);
                          fileInputRef.current?.click();
                          onClose();
                        } else if (item.id === 'folder-upload') {
                          console.log('Triggering folder input click');
                          folderInputRef.current?.click();
                          onClose();
                        } else {
                          console.log(`Clicked: ${item.label}`);
                          onClose();
                        }
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          flexWrap: 'nowrap',
                          alignItems: 'center',
                          width: '230px',
                          height: '36px',
                          maxWidth: '100%',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {/* Icon */}
                        {item.icon && (
                          <span
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              width: '16px',
                              height: '16px',
                              minHeight: '1px',
                              maxHeight: '36px',
                              margin: '0 4px',
                              verticalAlign: 'middle'
                            }}
                          >
                            <img
                              src={item.icon}
                              alt={item.iconAlt}
                              style={{
                                width: '16px',
                                height: '16px'
                              }}
                            />
                          </span>
                        )}

                        {/* SVG Icon for upload items */}
                        {item.svgIcon && (
                          <i
                            style={{
                              display: 'flex',
                              width: '20px',
                              height: '36px',
                              minHeight: '1px',
                              maxHeight: '36px',
                              margin: '0 1px',
                              fontSize: '16px',
                              fontStyle: 'normal',
                              verticalAlign: 'middle',
                              flexDirection: 'row',
                              flexShrink: 0,
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {item.svgIcon === 'DocumentArrowUpRegular' && <DocumentArrowUp20Regular />}
                            {item.svgIcon === 'FolderArrowUpRegular' && <FolderArrowUp20Regular />}
                          </i>
                        )}

                        {/* Label */}
                        <span
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            width: item.svgIcon ? '200px' : '198px',
                            height: '36px',
                            margin: '0 4px',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {item.label}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      {/* Upload Status Popup */}
      {uploadOperation && (
        <UploadStatusPopup
          operation={uploadOperation}
          itemName={currentFileName}
          progress={progress?.progress || 0}
          location="My files"
          onClose={() => {
            setUploadOperation(null);
            setCurrentFileName('');
          }}
          onSeeDetails={() => {
            console.log('See details clicked');
          }}
        />
      )}

      {/* Create Folder Dialog */}
      {showFolderDialog && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => {
              setShowFolderDialog(false);
              setFolderName('');
            }}
          >
            {/* Dialog */}
            <div
              style={{
                width: '440px',
                backgroundColor: 'rgb(41, 41, 41)',
                borderRadius: '8px',
                padding: '24px',
                boxShadow: '0 6.4px 14.4px 0 rgba(0, 0, 0, 0.432)',
                fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'rgb(255, 255, 255)',
                  marginBottom: '16px',
                  marginTop: 0
                }}
              >
                Create folder
              </h2>
              <input
                type="text"
                placeholder="Folder name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && folderName.trim() && !isCreatingFolder) {
                    setIsCreatingFolder(true);
                    try {
                      await apiCreateFolder(folderName.trim(), currentPath || undefined);
                      setShowFolderDialog(false);
                      setFolderName('');
                      await refreshFiles();
                      console.log('✅ Folder created successfully');
                    } catch (error) {
                      console.error('❌ Failed to create folder:', error);
                      alert(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    } finally {
                      setIsCreatingFolder(false);
                    }
                  } else if (e.key === 'Escape') {
                    setShowFolderDialog(false);
                    setFolderName('');
                  }
                }}
                disabled={isCreatingFolder}
                autoFocus
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '4px 8px',
                  border: '1px solid rgb(117, 117, 117)',
                  borderRadius: '4px',
                  backgroundColor: 'rgb(50, 49, 48)',
                  color: 'rgb(255, 255, 255)',
                  fontSize: '14px',
                  fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                  outline: 'none',
                  marginBottom: '20px',
                  boxSizing: 'border-box',
                  opacity: isCreatingFolder ? 0.6 : 1
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px'
                }}
              >
                <button
                  onClick={() => {
                    setShowFolderDialog(false);
                    setFolderName('');
                  }}
                  style={{
                    height: '32px',
                    padding: '0 20px',
                    border: '1px solid rgb(117, 117, 117)',
                    borderRadius: '4px',
                    backgroundColor: 'rgb(50, 49, 48)',
                    color: 'rgb(255, 255, 255)',
                    fontSize: '14px',
                    fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (folderName.trim() && !isCreatingFolder) {
                      setIsCreatingFolder(true);
                      try {
                        await apiCreateFolder(folderName.trim(), currentPath || undefined);
                        setShowFolderDialog(false);
                        setFolderName('');
                        await refreshFiles();
                        console.log('✅ Folder created successfully');
                      } catch (error) {
                        console.error('❌ Failed to create folder:', error);
                        alert(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
                      } finally {
                        setIsCreatingFolder(false);
                      }
                    }
                  }}
                  disabled={!folderName.trim() || isCreatingFolder}
                  style={{
                    height: '32px',
                    padding: '0 20px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: folderName.trim() && !isCreatingFolder ? 'rgb(0, 120, 212)' : 'rgb(60, 60, 60)',
                    color: folderName.trim() && !isCreatingFolder ? 'rgb(255, 255, 255)' : 'rgb(120, 120, 120)',
                    fontSize: '14px',
                    fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
                    cursor: folderName.trim() && !isCreatingFolder ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isCreatingFolder ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default CreateUploadDropdown;
