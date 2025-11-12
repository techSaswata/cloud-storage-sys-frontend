'use client';

import React, { useState, useEffect } from 'react';
import { useFiles } from '@/contexts/FilesContext';
import { BackendFile, getThumbnailUrl, getFileUrl, deleteFile as apiDeleteFile } from '@/lib/apiService';
import { Document24Regular } from '@fluentui/react-icons';

interface MyFilesViewProps {
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
  selectedFiles: Set<string>;
  setSelectedFiles: (files: Set<string>) => void;
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
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to get file icon based on type
function getFileIcon(file: BackendFile): string {
  const type = file.file_type;
  const ext = file.filename.split('.').pop()?.toLowerCase();
  
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

const MyFilesView: React.FC<MyFilesViewProps> = ({ currentFolderId, setCurrentFolderId, selectedFiles, setSelectedFiles }) => {
  const { files: allFiles, loading, refreshFiles } = useFiles();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [hoveredHeader, setHoveredHeader] = useState(false);

  // Filter files - for now, show all files (no folder structure yet)
  const files = allFiles;

  const handleFileClick = async (file: BackendFile) => {
    if (file.file_type === 'image' || file.file_type === 'video') {
      try {
        const urlData = await getFileUrl(file.file_id, 3600);
        window.open(urlData.url, '_blank');
      } catch (err) {
        console.error('Failed to open file:', err);
      }
    } else {
      // For other files, trigger download
      window.open(`http://localhost:8000/media/${file.file_id}/download`, '_blank');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await apiDeleteFile(fileId);
        refreshFiles();
      } catch (err) {
        console.error('Failed to delete file:', err);
        alert('Failed to delete file');
      }
    }
  };

  if (loading) {
    return (
      <div className="mt-2" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading files...</div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Conditional rendering: Show table only if files exist, otherwise show empty state */}
      {files.length > 0 ? (
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
                  checked={selectedFiles.size === files.length && files.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFiles(new Set(files.map(f => f.file_id)));
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

          {/* File rows */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 40px 434px 200px 200px 260px'
            }}
          >
            {files.map((file, index) => {
              const isLastRow = index === files.length - 1;
              return (
                <React.Fragment key={file.file_id}>
                  <div
                    style={{
                      display: 'contents'
                    }}
                    role="row"
                    onMouseEnter={() => setHoveredRow(file.file_id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Checkbox cell */}
                    <div
                      style={{
                        padding: '10px 2px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(file.file_id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.file_id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        borderBottomLeftRadius: isLastRow ? '12px' : '0',
                        borderTopLeftRadius: selectedFiles.has(file.file_id) ? '8px' : '0',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedFiles.has(file.file_id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset, rgb(41, 40, 39) 4px 0px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSelected = new Set(selectedFiles);
                        if (newSelected.has(file.file_id)) {
                          newSelected.delete(file.file_id);
                        } else {
                          newSelected.add(file.file_id);
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
                          opacity: hoveredRow === file.file_id || selectedFiles.has(file.file_id) ? 1 : 0,
                          transition: 'opacity 0.1s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${file.filename}`}
                          checked={selectedFiles.has(file.file_id)}
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
                            backgroundColor: selectedFiles.has(file.file_id) ? 'rgb(71, 158, 245)' : 'rgb(41, 40, 39)',
                            cursor: 'pointer',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {selectedFiles.has(file.file_id) && (
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
                        backgroundColor: selectedFiles.has(file.file_id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.file_id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedFiles.has(file.file_id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <img
                        src={getFileIcon(file)}
                        alt={file.file_type}
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
                        backgroundColor: selectedFiles.has(file.file_id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.file_id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        boxShadow: selectedFiles.has(file.file_id)
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
                              onDoubleClick={() => handleFileClick(file)}
                            >
                              {file.filename}
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
                              My files
                            </div>
                          </div>
                        </div>

                        {/* Action buttons - show on hover */}
                        {hoveredRow === file.file_id && (
                          <div style={{ display: 'flex', gap: '1px', alignItems: 'center', paddingRight: '8px' }}>
                            {/* More options button */}
                            <button
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: openDropdown === file.file_id ? 'rgb(61, 60, 59)' : 'transparent',
                                color: 'rgb(200, 198, 196)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.1s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (openDropdown !== file.file_id) {
                                  e.currentTarget.style.backgroundColor = 'rgb(61, 60, 59)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (openDropdown !== file.file_id) {
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
                                setOpenDropdown(openDropdown === file.file_id ? null : file.file_id);
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
                        backgroundColor: selectedFiles.has(file.file_id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.file_id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        boxShadow: selectedFiles.has(file.file_id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <span>{formatDate(file.updated_at)}</span>
                    </div>

                    {/* File size cell */}
                    <div
                      style={{
                        padding: '12px 8px 13px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(file.file_id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.file_id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        boxShadow: selectedFiles.has(file.file_id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <span>{formatFileSize(file.file_size)}</span>
                    </div>

                    {/* Type cell */}
                    <div
                      style={{
                        padding: '12px 8px 13px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(file.file_id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.file_id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        borderBottomRightRadius: isLastRow ? '12px' : '0',
                        borderTopRightRadius: selectedFiles.has(file.file_id) ? '8px' : '0',
                        position: 'relative',
                        transition: 'background-color 0.1s ease',
                        boxShadow: selectedFiles.has(file.file_id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset, rgb(41, 40, 39) -4px 0px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      {/* Divider line spanning all columns from left to right */}
                      {!isLastRow && !selectedFiles.has(file.file_id) && (
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
                      <span style={{ textTransform: 'capitalize' }}>{file.file_type}</span>
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
                const file = files.find(f => f.file_id === openDropdown);
                if (file) {
                  handleFileClick(file);
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
