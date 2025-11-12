'use client';

import React, { useState, useEffect } from 'react';
import { getDeletedFiles, formatDate, formatFileSize, FileItem, restoreFiles, permanentlyDeleteFiles } from '@/lib/fileStore';
import { Document24Regular } from '@fluentui/react-icons';

const RecycleBinView: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [hoveredHeader, setHoveredHeader] = useState(false);

  const handleRestore = () => {
    if (selectedFiles.size > 0) {
      restoreFiles(Array.from(selectedFiles));
      setSelectedFiles(new Set());
    }
  };

  const handlePermanentDelete = () => {
    if (selectedFiles.size > 0) {
      if (confirm(`Are you sure you want to permanently delete ${selectedFiles.size} item(s)? This action cannot be undone.`)) {
        permanentlyDeleteFiles(Array.from(selectedFiles));
        setSelectedFiles(new Set());
      }
    }
  };

  const handleEmptyRecycleBin = () => {
    if (files.length > 0) {
      if (confirm(`Are you sure you want to empty the Recycle Bin? All ${files.length} item(s) will be permanently deleted. This action cannot be undone.`)) {
        permanentlyDeleteFiles(files.map(f => f.id));
      }
    }
  };

  useEffect(() => {
    const loadFiles = () => {
      const deletedFiles = getDeletedFiles();
      setFiles(deletedFiles);
    };

    loadFiles();

    const handleStorageChange = () => {
      loadFiles();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('filesUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('filesUpdated', handleStorageChange);
    };
  }, []);

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
            {files.length > 0 && (
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

      {/* Page title */}
      <div
        style={{
          marginBottom: '24px',
          fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif'
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: 600,
            lineHeight: '36px',
            color: 'rgb(173, 173, 173)',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}
        >
          Recycle bin
        </h2>
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
                checked={selectedFiles.size === files.length && files.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFiles(new Set(files.map(f => f.id)));
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

        {/* File rows */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '56px 40px 434px 300px 200px'
          }}
        >
          {files.map((file, index) => {
            const isLastRow = index === files.length - 1;
            return (
              <React.Fragment key={file.id}>
                <div
                  style={{
                    display: 'contents'
                  }}
                  role="row"
                  onMouseEnter={() => setHoveredRow(file.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                    {/* Checkbox cell */}
                    <div
                      style={{
                        padding: '10px 2px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(file.id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        borderBottomLeftRadius: isLastRow ? '12px' : '0',
                        borderTopLeftRadius: selectedFiles.has(file.id) ? '8px' : '0',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedFiles.has(file.id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset, rgb(41, 40, 39) 4px 0px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSelected = new Set(selectedFiles);
                        if (newSelected.has(file.id)) {
                          newSelected.delete(file.id);
                        } else {
                          newSelected.add(file.id);
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
                          opacity: hoveredRow === file.id || selectedFiles.has(file.id) ? 1 : 0,
                          transition: 'opacity 0.1s ease'
                        }}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${file.name}`}
                          checked={selectedFiles.has(file.id)}
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
                            backgroundColor: selectedFiles.has(file.id) ? 'rgb(71, 158, 245)' : 'rgb(41, 40, 39)',
                            cursor: 'pointer',
                            zIndex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {selectedFiles.has(file.id) && (
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
                        backgroundColor: selectedFiles.has(file.id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: selectedFiles.has(file.id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <img
                        src={file.icon}
                        alt={file.type}
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
                        backgroundColor: selectedFiles.has(file.id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        boxShadow: selectedFiles.has(file.id)
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
                          {file.name}
                        </div>
                      </div>
                    </div>

                    {/* Original location cell */}
                    <div
                      style={{
                        padding: '12px 8px 13px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(file.id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        transition: 'all 0.1s ease',
                        boxShadow: selectedFiles.has(file.id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      <span>{file.originalLocation || file.location}</span>
                    </div>

                    {/* Date deleted cell */}
                    <div
                      style={{
                        padding: '12px 8px 13px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: selectedFiles.has(file.id)
                          ? 'rgb(28, 54, 80)'
                          : hoveredRow === file.id
                            ? 'rgb(51, 50, 49)'
                            : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'visible',
                        display: 'flex',
                        alignItems: 'center',
                        borderBottomRightRadius: isLastRow ? '12px' : '0',
                        borderTopRightRadius: selectedFiles.has(file.id) ? '8px' : '0',
                        position: 'relative',
                        transition: 'background-color 0.1s ease',
                        boxShadow: selectedFiles.has(file.id)
                          ? 'rgb(41, 40, 39) 0px 4px 0px 0px inset, rgb(41, 40, 39) 0px -4px 0px 0px inset, rgb(41, 40, 39) -4px 0px 0px 0px inset'
                          : 'none'
                      }}
                      role="gridcell"
                    >
                      {/* Divider line spanning all columns from left to right */}
                      {!isLastRow && !selectedFiles.has(file.id) && (
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
                      <span>{file.deletedAt ? formatDate(file.deletedAt) : 'Unknown'}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
        </div>
      </div>

      {/* Empty state - shown outside the table when no files */}
      {files.length === 0 && (
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
