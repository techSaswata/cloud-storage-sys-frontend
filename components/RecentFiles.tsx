'use client';

import React, { useState, useEffect } from 'react';
import { getRecentFiles, formatDate, FileItem, trackFileOpen } from '@/lib/fileStore';

type FileType = 'all' | 'word' | 'excel' | 'powerpoint' | 'onenote';

const RecentFiles = () => {
  const [activeFilter, setActiveFilter] = useState<FileType>('all');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  const getFilterButtonStyle = (isActive: boolean, isAllButton = false) => ({
    height: '32px',
    padding: isAllButton ? '0 20px' : '0 12px',
    border: isActive ? '1px solid rgb(71, 158, 245)' : '1px solid rgb(107, 107, 107)',
    borderRadius: '18px',
    backgroundColor: isActive ? 'rgb(6, 23, 36)' : 'rgb(10, 10, 10)',
    color: 'rgb(255, 255, 255)',
    fontSize: '14px',
    fontWeight: 400,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.2s',
    position: 'relative' as const,
    overflow: 'hidden' as const
  });

  useEffect(() => {
    // Load recent files (uploaded within 2 hours or opened within 24 hours)
    const loadFiles = () => {
      const recentFiles = getRecentFiles();
      setFiles(recentFiles);
    };

    loadFiles();

    // Listen for storage events to update when files are uploaded or opened
    const handleStorageChange = () => {
      loadFiles();
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for a custom event for same-page updates
    window.addEventListener('filesUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('filesUpdated', handleStorageChange);
    };
  }, []);

  const filteredFiles = files
    .filter(file => activeFilter === 'all' || file.type === activeFilter)
    .filter(file => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        file.name.toLowerCase().includes(query) ||
        file.owner.toLowerCase().includes(query)
      );
    });

  return (
    <div className="mt-10 ml-5">
      {/* Recent header and filter tabs */}
      <div className="flex items-center gap-4 mb-6 justify-between">
        <div className="flex items-center gap-4">
          <h1
            style={{
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '28px',
              color: 'rgb(173, 173, 173)',
              fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
              marginLeft: '8px'
            }}
          >
            Recent
          </h1>

          <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            style={getFilterButtonStyle(activeFilter === 'all', true)}
            className="flex items-center"
          >
            {activeFilter === 'all' && (
              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  borderRadius: '18px',
                  border: '2px solid rgb(71, 158, 245)',
                  backgroundImage: 'linear-gradient(128.84deg, rgb(15, 84, 140) 20.46%, rgb(19, 26, 112) 72.3%)',
                  opacity: 0.3,
                  pointerEvents: 'none'
                }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>All</span>
          </button>

          <button
            onClick={() => setActiveFilter('word')}
            style={getFilterButtonStyle(activeFilter === 'word')}
            className="flex items-center gap-1.5"
          >
            {activeFilter === 'word' && (
              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  borderRadius: '18px',
                  border: '2px solid rgb(71, 158, 245)',
                  backgroundImage: 'linear-gradient(128.84deg, rgb(15, 84, 140) 20.46%, rgb(19, 26, 112) 72.3%)',
                  opacity: 0.3,
                  pointerEvents: 'none'
                }}
              />
            )}
            <img
              src="https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/word_16x1.svg"
              alt=""
              style={{ width: '16px', height: '16px', position: 'relative', zIndex: 1 }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>Word</span>
          </button>

          <button
            onClick={() => setActiveFilter('excel')}
            style={getFilterButtonStyle(activeFilter === 'excel')}
            className="flex items-center gap-1.5"
          >
            {activeFilter === 'excel' && (
              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  borderRadius: '18px',
                  border: '2px solid rgb(71, 158, 245)',
                  backgroundImage: 'linear-gradient(128.84deg, rgb(15, 84, 140) 20.46%, rgb(19, 26, 112) 72.3%)',
                  opacity: 0.3,
                  pointerEvents: 'none'
                }}
              />
            )}
            <img
              src="https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/excel_16x1.svg"
              alt=""
              style={{ width: '16px', height: '16px', position: 'relative', zIndex: 1 }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>Excel</span>
          </button>

          <button
            onClick={() => setActiveFilter('powerpoint')}
            style={getFilterButtonStyle(activeFilter === 'powerpoint')}
            className="flex items-center gap-1.5"
          >
            {activeFilter === 'powerpoint' && (
              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  borderRadius: '18px',
                  border: '2px solid rgb(71, 158, 245)',
                  backgroundImage: 'linear-gradient(128.84deg, rgb(15, 84, 140) 20.46%, rgb(19, 26, 112) 72.3%)',
                  opacity: 0.3,
                  pointerEvents: 'none'
                }}
              />
            )}
            <img
              src="https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/powerpoint_16x1.svg"
              alt=""
              style={{ width: '16px', height: '16px', position: 'relative', zIndex: 1 }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>PowerPoint</span>
          </button>

          <button
            onClick={() => setActiveFilter('onenote')}
            style={getFilterButtonStyle(activeFilter === 'onenote')}
            className="flex items-center gap-1.5"
          >
            {activeFilter === 'onenote' && (
              <div
                style={{
                  position: 'absolute',
                  inset: '0',
                  borderRadius: '18px',
                  border: '2px solid rgb(71, 158, 245)',
                  backgroundImage: 'linear-gradient(128.84deg, rgb(15, 84, 140) 20.46%, rgb(19, 26, 112) 72.3%)',
                  opacity: 0.3,
                  pointerEvents: 'none'
                }}
              />
            )}
            <img
              src="https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/onenote_16x1.svg"
              alt=""
              style={{ width: '16px', height: '16px', position: 'relative', zIndex: 1 }}
            />
            <span style={{ position: 'relative', zIndex: 1 }}>OneNote</span>
          </button>
        </div>
        </div>

        {/* Search box on the right */}
        <div
          role="search"
          aria-label="Filter by name or person"
          style={{
            display: 'flex',
            position: 'relative',
            width: '240px',
            height: '32px',
            padding: '0 16px',
            border: '1px solid rgb(117, 117, 117)',
            borderRadius: '16px',
            fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
            fontSize: '16px',
            color: 'rgb(173, 173, 173)',
            transition: 'all 0.2s',
            alignItems: 'center'
          }}
        >
          <input
            placeholder="Filter by name or person"
            role="searchbox"
            aria-label="Filter by name or person"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              height: '18.5px',
              margin: '0 0 2px',
              padding: '1px 2px',
              border: 'none',
              borderRadius: '0',
              fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif',
              fontSize: '14px',
              whiteSpace: 'nowrap',
              color: 'rgb(214, 214, 214)',
              backgroundColor: 'transparent',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Conditional rendering: Show table only if files exist, otherwise show empty state */}
      {filteredFiles.length > 0 ? (
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
          {/* Table header row with 3 columns */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '730px 200px 260px',
              backgroundColor: 'rgb(41, 40, 39)',
              position: 'relative'
            }}
            role="row"
          >
            {/* Thin divider line with margins */}
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
            {/* Name column header */}
            <div
              style={{
                padding: '6px 2px',
                boxSizing: 'border-box',
                borderTopLeftRadius: '12px'
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

            {/* Last opened column header */}
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
                Opened
              </div>
            </div>

            {/* Owner column header */}
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
                Owner
              </div>
            </div>
          </div>

          {/* File rows */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '730px 200px 260px'
            }}
          >
            {filteredFiles.map((file, index) => {
              const isLastRow = index === filteredFiles.length - 1;
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
                    {/* Name cell */}
                    <div
                      style={{
                        padding: '12px 8px 13px',
                        minHeight: '46px',
                        maxHeight: '400px',
                        backgroundColor: hoveredRow === file.id ? 'rgb(51, 50, 49)' : 'rgb(41, 40, 39)',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        borderBottomLeftRadius: isLastRow ? '12px' : '0',
                        position: 'relative',
                        transition: 'background-color 0.1s ease'
                      }}
                      role="gridcell"
                    >
                      {/* Divider line - only in first column */}
                      {!isLastRow && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '0',
                            left: '12px',
                            right: '-742px',
                            height: '1px',
                            backgroundColor: 'rgb(59, 58, 57)'
                          }}
                        />
                      )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', paddingLeft: '8px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                      <img
                        src={file.icon}
                        alt={file.type}
                        style={{ width: '32px', height: '32px' }}
                      />
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
                            // Track file open and open in new tab
                            trackFileOpen(file.id);
                            window.open(file.path, '_blank');
                          }}
                        >
                          {file.name}
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
                          {file.location}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons - show on hover (right side of name section) */}
                    {hoveredRow === file.id && (
                      <div style={{ display: 'flex', gap: '1px', alignItems: 'center', paddingRight: '8px' }}>
                        {/* More options button */}
                        <button
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: openDropdown === file.id ? 'rgb(61, 60, 59)' : 'transparent',
                            color: 'rgb(200, 198, 196)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.1s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (openDropdown !== file.id) {
                              e.currentTarget.style.backgroundColor = 'rgb(61, 60, 59)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (openDropdown !== file.id) {
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
                            setOpenDropdown(openDropdown === file.id ? null : file.id);
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

                {/* Last opened cell */}
                <div
                  style={{
                    padding: '12px 8px 13px',
                    minHeight: '46px',
                    maxHeight: '400px',
                    backgroundColor: hoveredRow === file.id ? 'rgb(51, 50, 49)' : 'rgb(41, 40, 39)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    position: 'relative',
                    transition: 'background-color 0.1s ease'
                  }}
                  role="gridcell"
                >
                  {/* Divider line middle - continues from first column */}
                  {!isLastRow && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        height: '1px',
                        backgroundColor: 'rgb(59, 58, 57)'
                      }}
                    />
                  )}
                  <span>{formatDate(file.lastOpenedAt || file.uploadedAt)}</span>
                </div>

                {/* Owner cell */}
                <div
                  style={{
                    padding: '12px 8px 13px',
                    minHeight: '46px',
                    maxHeight: '400px',
                    backgroundColor: hoveredRow === file.id ? 'rgb(51, 50, 49)' : 'rgb(41, 40, 39)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottomRightRadius: isLastRow ? '12px' : '0',
                    position: 'relative',
                    transition: 'background-color 0.1s ease'
                  }}
                  role="gridcell"
                >
                  {/* Divider line end - only in last column */}
                  {!isLastRow && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '12px',
                        left: '-200px',
                        height: '1px',
                        backgroundColor: 'rgb(59, 58, 57)'
                      }}
                    />
                  )}
                  <span>{file.owner}</span>
                </div>
              </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '100px 24px 120px',
          textAlign: 'center',
          color: 'rgb(173, 173, 173)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px'
        }}>
          <img
            src="https://res-1.cdn.office.net/files/sp-client/odsp-media-38d8b5f2/images/emptyfolder/empty_recent_v3_dark.webp"
            alt="No recent files"
            style={{
              width: '280px',
              height: 'auto',
              opacity: 0.9
            }}
          />
          <div style={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'rgb(214, 214, 214)',
            fontFamily: '"Segoe UI Web (West European)", -apple-system, "system-ui", Roboto, "Helvetica Neue", sans-serif'
          }}>
            Your recent files will show up here
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
                const file = files.find(f => f.id === openDropdown);
                if (file) {
                  trackFileOpen(file.id);
                  window.open(file.path, '_blank');
                }
                setOpenDropdown(null);
              }}
            >
              {(() => {
                const file = files.find(f => f.id === openDropdown);
                if (!file) return null;

                // Get the correct icon URL based on file type
                let iconUrl = '';

                // For Word, Excel, PowerPoint, OneNote - use the brand icons from Recent filter buttons
                if (file.type === 'word') {
                  iconUrl = 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/word_16x1.svg';
                } else if (file.type === 'excel') {
                  iconUrl = 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/excel_16x1.svg';
                } else if (file.type === 'powerpoint') {
                  iconUrl = 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/powerpoint_16x1.svg';
                } else if (file.type === 'onenote') {
                  iconUrl = 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/onenote_16x1.svg';
                } else {
                  // For PDF, images, videos, and other files - use the file's actual icon (convert 32px to 16px)
                  iconUrl = file.icon.replace('/32/', '/16/');
                }

                return (
                  <>
                    <img
                      src={iconUrl}
                      alt=""
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Open</span>
                  </>
                );
              })()}
            </button>
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
                setOpenDropdown(null);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.25 3a.75.75 0 0 1 0 1.5h-3.5c-1.24 0-2.25 1-2.25 2.25v10.5l.01.23a2.25 2.25 0 0 0 2.24 2.02h10.5c1.24 0 2.25-1 2.25-2.25v-2a.75.75 0 0 1 1.5 0v2A3.75 3.75 0 0 1 17.25 21H6.75c-2 0-3.64-1.58-3.75-3.56V6.75A3.75 3.75 0 0 1 6.75 3h3.5Zm4.69-.93a.75.75 0 0 1 .8.11l7 6a.75.75 0 0 1 .03 1.11l-7 6.75a.75.75 0 0 1-1.27-.54v-2.98a7.24 7.24 0 0 0-2.94.77 11.43 11.43 0 0 0-3.69 3.3l-.27.36a.75.75 0 0 1-1.35-.45c0-2.86.69-5.59 2.17-7.63a8 8 0 0 1 6.08-3.34V2.65c.04-.26.2-.47.44-.58ZM16 6.25c0 .41-.34.75-.75.75a6.6 6.6 0 0 0-5.62 2.75 10.23 10.23 0 0 0-1.72 4.5A9.23 9.23 0 0 1 15.24 11a.75.75 0 0 1 .76.75v1.98l5.13-4.95L16 4.38v1.87Z" />
              </svg>
              <span>Share</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default RecentFiles;
