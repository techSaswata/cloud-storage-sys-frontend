'use client';

import './FavoritesView.css';
import './PhotosView.css';
import { useState, useEffect, useRef } from 'react';
import { getFavoriteFiles, groupGalleryItemsByDate, toggleFileFavorite, type FileItem } from '@/lib/fileStore';
import { useFileUpload } from '@/lib/useFileUpload';
import UploadStatusPopup, { type OperationType } from './UploadStatusPopup';
import {
  Info20Regular,
  Delete20Regular,
  Share20Regular,
  Star20Regular,
  Star20Filled
} from '@fluentui/react-icons';

export default function FavoritesView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const footerFileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMultipleFiles, progress, uploading } = useFileUpload();
  const [favoriteItems, setFavoriteItems] = useState<FileItem[]>([]);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpandedFooter, setShowExpandedFooter] = useState(false);
  const [uploadOperation, setUploadOperation] = useState<OperationType | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');

  useEffect(() => {
    loadFavoriteItems();

    // Listen for file updates
    window.addEventListener('filesUpdated', loadFavoriteItems);
    window.addEventListener('storage', loadFavoriteItems);

    return () => {
      window.removeEventListener('filesUpdated', loadFavoriteItems);
      window.removeEventListener('storage', loadFavoriteItems);
    };
  }, []);

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

  const loadFavoriteItems = () => {
    const items = getFavoriteFiles();
    setFavoriteItems(items);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Filter to only allow jpg, jpeg, mp4, mov files
    const allowedExtensions = ['jpg', 'jpeg', 'mp4', 'mov'];
    const filteredFiles = Array.from(files).filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      return ext && allowedExtensions.includes(ext);
    });

    if (filteredFiles.length === 0) {
      alert('Please upload only JPG, JPEG, MP4, or MOV files.');
      return;
    }

    await uploadMultipleFiles(filteredFiles);

    // Reload favorite items
    loadFavoriteItems();

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (footerFileInputRef.current) footerFileInputRef.current.value = '';
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

  const toggleFavorite = (itemId: string) => {
    toggleFileFavorite(itemId);
    loadFavoriteItems();
  };

  const handleDelete = (itemId: string) => {
    const { deleteFile } = require('@/lib/fileStore');
    deleteFile(itemId);
    loadFavoriteItems();
  };

  const handleDoubleClick = (itemPath: string) => {
    window.open(itemPath, '_blank');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Filter favorite items based on search query
  const filteredFavoriteItems = searchQuery.trim()
    ? favoriteItems.filter(item => {
        const itemDate = new Date(item.uploadedAt);
        // Use consistent date formatting with groupGalleryItemsByDate
        const month = itemDate.toLocaleDateString('en-US', { month: 'short' });
        const day = itemDate.getDate();
        const dateKey = `${month} ${day}`;
        const searchLower = searchQuery.toLowerCase().trim();

        // Check if the date matches the search query
        return dateKey.toLowerCase().includes(searchLower);
      })
    : favoriteItems;

  const groupedItems = groupGalleryItemsByDate(filteredFavoriteItems);
  const hasFavorites = favoriteItems.length > 0;

  return (
    <div className="favorites-view">
      {/* Header Section */}
      <div className="favorites-header-container">
        <div className="favorites-header">
          <div className="favorites-title-section">
            <div className="favorites-title-wrapper">
              <span className="favorites-title">Favorites</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {!hasFavorites ? (
        <div className="favorites-content">
          <div className="favorites-empty-state">
            <div className="favorites-illustration">
              <img
                src="https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/favorites_emptyState_dark_512_0057c210.png"
                alt="Favorites star"
                className="favorites-empty-image"
              />
            </div>

            <h2 className="favorites-empty-title">No favorites yet</h2>

            <p className="favorites-empty-description">
              Mark photos and videos as favorites to see them here.
            </p>
          </div>
        </div>
      ) : (
        <div className="favorites-gallery">
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
                  {items.map((item) => (
                    <div key={item.id} className={`gallery-item ${selectedDates.has(dateKey) ? 'selected' : ''}`}>
                      <div className="gallery-item-content" onDoubleClick={() => handleDoubleClick(item.path)}>
                        {item.type === 'image' ? (
                          <img
                            src={item.path}
                            alt={item.name}
                            className="gallery-image"
                          />
                        ) : (
                          <video
                            src={item.path}
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

                            <button className="gallery-action-btn" aria-label="Delete" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}>
                              <Delete20Regular style={{ color: 'white' }} />
                            </button>

                            <button className="gallery-action-btn" aria-label="Share" title="Share">
                              <Share20Regular style={{ color: 'white' }} />
                            </button>
                          </div>

                          {/* Standalone favorite button */}
                          <button
                            className={`gallery-item-favorite ${item.isFavorite ? 'is-favorited' : ''}`}
                            aria-label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                            title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                          >
                            {item.isFavorite ? (
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
        </div>
      )}

      {/* Footer - same as PhotosView */}
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
        accept=".jpg,.jpeg,.mp4,.mov"
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
