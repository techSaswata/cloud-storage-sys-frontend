'use client';

import './PhotosView.css';
import { useState, useRef, useEffect } from 'react';
import { useFileUpload } from '@/lib/useFileUpload';
import { useFiles } from '@/contexts/FilesContext';
import { getThumbnailUrl, getFileUrl, BackendFile } from '@/lib/apiService';
import UploadStatusPopup, { type OperationType } from './UploadStatusPopup';
import {
  Info20Regular,
  Delete20Regular,
  Share20Regular,
  Star20Regular,
  Star20Filled
} from '@fluentui/react-icons';

// Helper function to group files by date
function groupFilesByDate(files: BackendFile[]) {
  const groups: Record<string, BackendFile[]> = {};
  
  files.forEach(file => {
    const date = new Date(file.created_at);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const dateKey = `${month} ${day}`;
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(file);
  });
  
  return groups;
}

export default function PhotosView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const footerFileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMultipleFiles, progress, uploading } = useFileUpload();
  const { files, loading, refreshFiles } = useFiles();
  
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpandedFooter, setShowExpandedFooter] = useState(false);
  const [uploadOperation, setUploadOperation] = useState<OperationType | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});

  // Filter only image and video files
  const mediaFiles = files.filter(
    file => file.file_type === 'image' || file.file_type === 'video'
  );

  // Load file URLs for display
  useEffect(() => {
    async function loadUrls() {
      const urls: Record<string, string> = {};
      
      for (const file of mediaFiles.slice(0, 50)) { // Load first 50 for performance
        try {
          // Use thumbnail for faster loading
          urls[file.file_id] = getThumbnailUrl(file.file_id, 400);
        } catch (err) {
          console.error(`Failed to load URL for ${file.file_id}:`, err);
        }
      }
      
      setFileUrls(urls);
    }
    
    if (mediaFiles.length > 0) {
      loadUrls();
    }
  }, [mediaFiles.length]);

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
      // Refresh files after upload
      refreshFiles();
      // Reset after a delay
      setTimeout(() => {
        setUploadOperation(null);
        setCurrentFileName('');
      }, 3000);
    }
  }, [uploading, uploadOperation, refreshFiles]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Filter to only allow jpg, jpeg, png, mp4, mov files
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi'];
    const filteredFiles = Array.from(files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext && allowedExtensions.includes(ext);
    });

    if (filteredFiles.length === 0) {
      alert('Please upload only image or video files.');
      return;
    }

    await uploadMultipleFiles(filteredFiles);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (footerFileInputRef.current) footerFileInputRef.current.value = '';
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const triggerFooterFileUpload = () => {
    footerFileInputRef.current?.click();
  };

  const toggleDateSelection = (dateKey: string) => {
    setSelectedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const toggleFavorite = (fileId: string) => {
    // TODO: Implement favorite functionality with backend
    console.log('Toggle favorite:', fileId);
  };

  const handleDelete = async (fileId: string) => {
    // TODO: Implement delete with backend API
    console.log('Delete file:', fileId);
  };

  const handleDoubleClick = async (file: BackendFile) => {
    try {
      const urlData = await getFileUrl(file.file_id, 3600);
      window.open(urlData.url, '_blank');
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Filter gallery items based on search query
  const filteredGalleryItems = searchQuery.trim()
    ? mediaFiles.filter(file => {
        const itemDate = new Date(file.created_at);
        const month = itemDate.toLocaleDateString('en-US', { month: 'short' });
        const day = itemDate.getDate();
        const dateKey = `${month} ${day}`;
        const searchLower = searchQuery.toLowerCase().trim();
        return dateKey.toLowerCase().includes(searchLower) || 
               file.filename.toLowerCase().includes(searchLower);
      })
    : mediaFiles;

  const groupedItems = groupFilesByDate(filteredGalleryItems);
  const hasPhotos = mediaFiles.length > 0;

  if (loading) {
    return (
      <div className="photos-view" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading photos...</div>
      </div>
    );
  }

  return (
    <div className="photos-view">
      {!hasPhotos ? (
        <div className="photos-empty-state">
          <h1 className="photos-title">Keep your memories safe with OneDrive</h1>

          <div className="photos-gradient-background">
            <div className="gradient-circle gradient-blue"></div>
            <div className="gradient-circle gradient-purple"></div>
            <img
              className="background-image"
              src="https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/gallery_background_37750b5f.png"
              alt="Background"
            />
          </div>

          <div className="photos-actions">
            <button className="photo-action-button" onClick={triggerFileUpload}>
              <img
                src="https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/image_icon_f4b7371e.png"
                alt="Upload"
                className="action-icon"
              />
              <div className="action-content">
                <span className="action-header">Add photos here</span>
                <span className="action-text">
                  <span className="gradient-text">Upload from your device</span>
                </span>
              </div>
            </button>

            <div className="photo-action-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" className="mobile-icon">
                <path
                  d="M10.25 2C8.45508 2 7 3.45507 7 5.25V26.75C7 28.5449 8.45507 30 10.25 30H21.75C23.5449 30 25 28.5449 25 26.75V5.25C25 3.45507 23.5449 2 21.75 2H10.25Z"
                  fill="url(#paint0_radial_mobile)"
                />
                <path
                  d="M14 24H18C18.5523 24 19 24.4477 19 25C19 25.5523 18.5523 26 18 26H14C13.4477 26 13 25.5523 13 25C13 24.4477 13.4477 24 14 24Z"
                  fill="url(#paint1_radial_mobile)"
                />
                <defs>
                  <radialGradient
                    id="paint0_radial_mobile"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(7 1.125) rotate(61.1666) scale(36.1576 71.7141)"
                  >
                    <stop stopColor="#CB7DF8" />
                    <stop offset="0.412452" stopColor="#9C6CFE" />
                    <stop offset="1" stopColor="#4E44DB" />
                  </radialGradient>
                  <radialGradient
                    id="paint1_radial_mobile"
                    cx="0"
                    cy="0"
                    r="1"
                    gradientUnits="userSpaceOnUse"
                    gradientTransform="translate(12.0625 24.1333) rotate(40.8628) scale(10.4955 12.3381)"
                  >
                    <stop stopColor="#DECBFF" />
                    <stop offset="1" stopColor="#D1D1FF" />
                  </radialGradient>
                </defs>
              </svg>
              <div className="action-content">
                <span className="action-header">Back up phone photos</span>
                <span className="action-text">
                  <span className="gradient-text">Get the mobile app</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="photos-gallery">
          <h1 className="gallery-title">Gallery ({mediaFiles.length} photos)</h1>

          <div className="gallery-content">
            {Object.entries(groupedItems).map(([dateKey, items]) => (
              <div key={dateKey} className="gallery-date-group">
                <div className="gallery-date-header">
                  <div className="date-checkbox-wrapper">
                    <button
                      className={`date-checkbox ${selectedDates.has(dateKey) ? 'selected' : ''}`}
                      aria-label={`Select all photos for ${dateKey}`}
                      role="checkbox"
                      aria-checked={selectedDates.has(dateKey)}
                      onClick={() => toggleDateSelection(dateKey)}
                    >
                      <div className="checkbox-circle">
                        {selectedDates.has(dateKey) && (
                          <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <path
                              d="M11.765 5.20474C12.0661 5.48915 12.0797 5.96383 11.7953 6.26497L7.54526 10.765C7.40613 10.9123 7.21332 10.997 7.01071 10.9999C6.8081 11.0028 6.61295 10.9236 6.46967 10.7803L4.21967 8.53033C3.92678 8.23744 3.92678 7.76257 4.21967 7.46967C4.51256 7.17678 4.98744 7.17678 5.28033 7.46967L6.98463 9.17397L10.7047 5.23503C10.9891 4.9339 11.4638 4.92033 11.765 5.20474Z"
                              fill="white"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                    <time className="date-label">{dateKey}</time>
                  </div>
                </div>

                <div className="gallery-grid">
                  {items.map((file) => (
                    <div key={file.file_id} className={`gallery-item ${selectedDates.has(dateKey) ? 'selected' : ''}`}>
                      <div className="gallery-item-content" onDoubleClick={() => handleDoubleClick(file)}>
                        {file.file_type === 'image' ? (
                          <img
                            src={fileUrls[file.file_id] || getThumbnailUrl(file.file_id, 400)}
                            alt={file.filename}
                            className="gallery-image"
                            loading="lazy"
                          />
                        ) : (
                          <video
                            src={fileUrls[file.file_id]}
                            className="gallery-video"
                            preload="metadata"
                          />
                        )}
                      </div>

                      {/* Hover overlay with action buttons (only for unselected items) */}
                      {!selectedDates.has(dateKey) && (
                        <>
                          {/* Top-right checkbox */}
                          <button
                            className="gallery-item-checkbox-hover"
                            aria-label="Select photo"
                            role="checkbox"
                            aria-checked="false"
                          >
                            <div className="gallery-checkbox-circle-hover"></div>
                          </button>

                          {/* Bottom action buttons */}
                          <div className="gallery-item-actions">
                            <button className="gallery-action-btn" aria-label="Info" title="Info">
                              <Info20Regular style={{ color: 'white' }} />
                            </button>

                            <button className="gallery-action-btn" aria-label="Delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(file.file_id); }}>
                              <Delete20Regular style={{ color: 'white' }} />
                            </button>

                            <button className="gallery-action-btn" aria-label="Share" title="Share">
                              <Share20Regular style={{ color: 'white' }} />
                            </button>
                          </div>

                          {/* Standalone favorite button */}
                          <button
                            className={`gallery-item-favorite ${file.isFavorite ? 'is-favorited' : ''}`}
                            aria-label={file.isFavorite ? "Remove from favorites" : "Add to favorites"}
                            title={file.isFavorite ? "Remove from favorites" : "Add to favorites"}
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(file.file_id); }}
                          >
                            {file.isFavorite ? (
                              <Star20Filled style={{ color: 'white' }} />
                            ) : (
                              <Star20Regular style={{ color: 'white' }} />
                            )}
                          </button>
                        </>
                      )}

                      {/* Selected state checkbox */}
                      {selectedDates.has(dateKey) && (
                        <button
                          className="gallery-item-checkbox selected"
                          aria-label="Photo"
                          role="checkbox"
                          aria-checked="true"
                        >
                          <div className="gallery-checkbox-circle">
                            <svg
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                            >
                              <path
                                d="M11.765 5.20474C12.0661 5.48915 12.0797 5.96383 11.7953 6.26497L7.54526 10.765C7.40613 10.9123 7.21332 10.997 7.01071 10.9999C6.8081 11.0028 6.61295 10.9236 6.46967 10.7803L4.21967 8.53033C3.92678 8.23744 3.92678 7.76257 4.21967 7.46967C4.51256 7.17678 4.98744 7.17678 5.28033 7.46967L6.98463 9.17397L10.7047 5.23503C10.9891 4.9339 11.4638 4.92033 11.765 5.20474Z"
                                fill="white"
                              />
                            </svg>
                          </div>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Add more photos section */}
          <div className="add-more-photos-section">
            <h2 className="add-more-title">Want to add more photos?</h2>
            <div className="add-more-actions">
              <button className="add-more-button" onClick={triggerFileUpload}>
                <img
                  src="https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/image_icon_f4b7371e.png"
                  alt="Upload"
                  className="add-more-icon"
                />
                <div className="add-more-content">
                  <span className="add-more-header">Add photos here</span>
                  <span className="add-more-text">
                    <span className="gradient-text">Upload from your device</span>
                  </span>
                </div>
              </button>

              <div className="add-more-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none" className="mobile-icon">
                  <path
                    d="M10.25 2C8.45508 2 7 3.45507 7 5.25V26.75C7 28.5449 8.45507 30 10.25 30H21.75C23.5449 30 25 28.5449 25 26.75V5.25C25 3.45507 23.5449 2 21.75 2H10.25Z"
                    fill="url(#paint0_radial_mobile_add)"
                  />
                  <path
                    d="M14 24H18C18.5523 24 19 24.4477 19 25C19 25.5523 18.5523 26 18 26H14C13.4477 26 13 25.5523 13 25C13 24.4477 13.4477 24 14 24Z"
                    fill="url(#paint1_radial_mobile_add)"
                  />
                  <defs>
                    <radialGradient
                      id="paint0_radial_mobile_add"
                      cx="0"
                      cy="0"
                      r="1"
                      gradientUnits="userSpaceOnUse"
                      gradientTransform="translate(7 1.125) rotate(61.1666) scale(36.1576 71.7141)"
                    >
                      <stop stopColor="#CB7DF8" />
                      <stop offset="0.412452" stopColor="#9C6CFE" />
                      <stop offset="1" stopColor="#4E44DB" />
                    </radialGradient>
                    <radialGradient
                      id="paint1_radial_mobile_add"
                      cx="0"
                      cy="0"
                      r="1"
                      gradientUnits="userSpaceOnUse"
                      gradientTransform="translate(12.0625 24.1333) rotate(40.8628) scale(10.4955 12.3381)"
                    >
                      <stop stopColor="#DECBFF" />
                      <stop offset="1" stopColor="#D1D1FF" />
                    </radialGradient>
                  </defs>
                </svg>
                <div className="add-more-content">
                  <span className="add-more-header">Back up phone photos</span>
                  <span className="add-more-text">
                    <span className="gradient-text">Get the mobile app</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for uploads - accessible from both states */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden-file-input"
        accept="image/*,video/*"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      <div className={`photos-footer ${showExpandedFooter ? 'expanded' : ''}`}>
        {!showExpandedFooter ? (
          <>
            <button className="footer-add-button" aria-label="Add photos" onClick={() => setShowExpandedFooter(true)}>
              <span className="add-icon">
                <svg fill="currentColor" aria-hidden="true" width="24" height="24" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2.25c.41 0 .75.34.75.75v6.25H17a.75.75 0 0 1 0 1.5h-6.25V17a.75.75 0 0 1-1.5 0v-6.25H3a.75.75 0 0 1 0-1.5h6.25V3c0-.41.34-.75.75-.75Z" fill="currentColor"></path>
                </svg>
              </span>
            </button>

            <div className="footer-search-container">
              <form className="footer-search-form" role="search">
                <div className="footer-search-input-wrapper">
                  <span className="search-icon-before">
                    <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.73 13.44a6.5 6.5 0 1 1 .7-.7l3.42 3.4a.5.5 0 0 1-.63.77l-.07-.06-3.42-3.41Zm-.71-.71A5.54 5.54 0 0 0 14 8.5a5.5 5.5 0 1 0-1.98 4.23Z" fill="currentColor"></path>
                    </svg>
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Search your photos"
                    className="footer-search-input"
                    name="q"
                    value={searchQuery}
                    onChange={handleSearchChange}
                  />
                  <span className="search-icon-after">
                    <button
                      type="button"
                      aria-label="Clear the search box"
                      className="footer-clear-button"
                      onClick={handleClearSearch}
                      style={{ visibility: searchQuery ? 'visible' : 'hidden' }}
                    >
                      <span className="clear-icon">
                        <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path d="m4.09 4.22.06-.07a.5.5 0 0 1 .63-.06l.07.06L10 9.29l5.15-5.14a.5.5 0 0 1 .63-.06l.07.06c.18.17.2.44.06.63l-.06.07L10.71 10l5.14 5.15c.18.17.2.44.06.63l-.06.07a.5.5 0 0 1-.63.06l-.07-.06L10 10.71l-5.15 5.14a.5.5 0 0 1-.63.06l-.07-.06a.5.5 0 0 1-.06-.63l.06-.07L9.29 10 4.15 4.85a.5.5 0 0 1-.06-.63l.06-.07-.06.07Z" fill="currentColor"></path>
                        </svg>
                      </span>
                    </button>
                  </span>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="footer-expanded">
            <div className="footer-expanded-content">
              <div className="footer-expanded-buttons">
                <button className="footer-expanded-upload" onClick={triggerFooterFileUpload}>
                  <span className="footer-btn-icon">
                    <svg fill="currentColor" aria-hidden="true" width="24" height="24" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 3a.5.5 0 0 0 .09-.99H4a.5.5 0 0 0-.09.98L4 3h11ZM9.5 18a.5.5 0 0 0 .5-.41V5.7l3.64 3.65c.17.18.44.2.64.06l.07-.06a.5.5 0 0 0 .06-.63l-.06-.07-4.5-4.5A.5.5 0 0 0 9.6 4h-.1a.5.5 0 0 0-.4.19L4.64 8.65a.5.5 0 0 0 .64.76l.07-.06L9 5.71V17.5c0 .28.22.5.5.5Z" fill="currentColor"></path>
                    </svg>
                  </span>
                  Upload
                  <span className="footer-btn-chevron">
                    <svg fill="currentColor" aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.85 7.65c.2.2.2.5 0 .7l-5.46 5.49a.55.55 0 0 1-.78 0L4.15 8.35a.5.5 0 1 1 .7-.7L10 12.8l5.15-5.16c.2-.2.5-.2.7 0Z" fill="currentColor"></path>
                    </svg>
                  </span>
                </button>
                <button className="footer-expanded-album">
                  <span className="footer-btn-icon">
                    <svg fill="currentColor" aria-hidden="true" width="24" height="24" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 6c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5.6c.16-.32.3-.65.4-1H16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H6v3.02a5.57 5.57 0 0 0-1 0V5H4a1 1 0 0 0-1 1v2.6c-.36.18-.7.4-1 .66V6Zm11.5 5h-3.1a5.5 5.5 0 0 0-.66-1h3.76a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5v.76a5.5 5.5 0 0 0-1-.66v-.1C8 7.67 8.67 7 9.5 7h4c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5ZM10 13.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-4-2a.5.5 0 0 0-1 0V13H3.5a.5.5 0 0 0 0 1H5v1.5a.5.5 0 0 0 1 0V14h1.5a.5.5 0 0 0 0-1H6v-1.5Z" fill="currentColor"></path>
                    </svg>
                  </span>
                  New album
                </button>
              </div>
            </div>
            <button className="footer-expanded-close" onClick={() => setShowExpandedFooter(false)}>
              <span className="footer-close-icon">
                <svg fill="currentColor" aria-hidden="true" width="24" height="24" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="m4.09 4.22.06-.07a.5.5 0 0 1 .63-.06l.07.06L10 9.29l5.15-5.14a.5.5 0 0 1 .63-.06l.07.06c.18.17.2.44.06.63l-.06.07L10.71 10l5.14 5.15c.18.17.2.44.06.63l-.06.07a.5.5 0 0 1-.63.06l-.07-.06L10 10.71l-5.15 5.14a.5.5 0 0 1-.63.06l-.07-.06a.5.5 0 0 1-.06-.63l.06-.07L9.29 10 4.15 4.85a.5.5 0 0 1-.06-.63l.06-.07-.06.07Z" fill="currentColor"></path>
                </svg>
              </span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={footerFileInputRef}
        type="file"
        className="hidden-file-input"
        accept="image/*,video/*"
        multiple
        onChange={(e) => handleFileUpload(e.target.files)}
      />

      {uploadOperation && (
        <UploadStatusPopup
          operation={uploadOperation}
          itemName={currentFileName}
          progress={progress?.progress || 0}
          location="My files"
          isPhotosTab={true}
          onClose={() => {
            setUploadOperation(null);
            setCurrentFileName('');
          }}
          onSeeDetails={() => {
            console.log('See details clicked');
          }}
        />
      )}
    </div>
  );
}
