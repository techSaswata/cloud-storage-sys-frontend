'use client';

import './AlbumsView.css';
import './PhotosView.css';
import { useState, useEffect } from 'react';
import { getGalleryItems, groupGalleryItemsByDate, type FileItem } from '@/lib/fileStore';
import { Delete20Regular, Share20Regular } from '@fluentui/react-icons';

interface Album {
  id: string;
  name: string;
  photos: FileItem[];
  createdAt: string;
}

export default function AlbumsView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSelectPhotosOpen, setIsSelectPhotosOpen] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [galleryItems, setGalleryItems] = useState<FileItem[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [albums, setAlbums] = useState<Album[]>([]);
  const [showExpandedFooter, setShowExpandedFooter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGalleryItems();
    loadAlbums();
  }, []);

  const loadGalleryItems = () => {
    const items = getGalleryItems();
    setGalleryItems(items);
  };

  const loadAlbums = () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('onedrive-albums');
    if (stored) {
      setAlbums(JSON.parse(stored));
    }
  };

  const handleCreateAlbum = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setAlbumName('');
  };

  const handleCloseSelectPhotos = () => {
    setIsSelectPhotosOpen(false);
    setSelectedPhotos(new Set());
    setAlbumName('');
  };

  const handleAlbumNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlbumName(e.target.value);
  };

  const handleNext = () => {
    if (albumName.trim()) {
      setIsDialogOpen(false);
      setIsSelectPhotosOpen(true);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const handleCreateWithPhotos = () => {
    if (albumName.trim()) {
      // Get selected photo items
      const selectedPhotoItems = galleryItems.filter(item => selectedPhotos.has(item.id));

      // Create album object
      const newAlbum: Album = {
        id: Date.now().toString() + Math.random().toString(36),
        name: albumName.trim(),
        photos: selectedPhotoItems,
        createdAt: new Date().toISOString()
      };

      // Save to localStorage
      const updatedAlbums = [newAlbum, ...albums];
      localStorage.setItem('onedrive-albums', JSON.stringify(updatedAlbums));
      setAlbums(updatedAlbums);

      handleCloseSelectPhotos();
    }
  };

  const handleDeleteAlbum = (albumId: string) => {
    const updatedAlbums = albums.filter(album => album.id !== albumId);
    localStorage.setItem('onedrive-albums', JSON.stringify(updatedAlbums));
    setAlbums(updatedAlbums);
  };

  const formatAlbumDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="albums-view">
      {/* Header Section */}
      <div className="albums-header-container">
        <div className="albums-header">
          <div className="albums-title-section">
            <div className="albums-title-wrapper">
              <span className="albums-title">Albums</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {albums.length === 0 ? (
        <div className="albums-content">
          <div className="albums-empty-state">
            <div className="albums-illustration">
              <img
                src="https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/albums_l1_emptyState_dark_512_77c67a28.png"
                alt="Albums illustration"
                className="albums-empty-image"
              />
            </div>

            <h2 className="albums-empty-title">Collect your best moments</h2>

            <p className="albums-empty-description">
              Capture, save, and share your moments in albums for lasting memories.
            </p>

            <button className="albums-create-button" onClick={handleCreateAlbum}>
              <span className="albums-button-icon">
                <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 6c0-1.1.9-2 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5.6c.16-.32.3-.65.4-1H16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H6v3.02a5.57 5.57 0 0 0-1 0V5H4a1 1 0 0 0-1 1v2.6c-.36.18-.7.4-1 .66V6Zm11.5 5h-3.1a5.5 5.5 0 0 0-.66-1h3.76a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5v.76a5.5 5.5 0 0 0-1-.66v-.1C8 7.67 8.67 7 9.5 7h4c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5ZM10 13.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-4-2a.5.5 0 0 0-1 0V13H3.5a.5.5 0 0 0 0 1H5v1.5a.5.5 0 0 0 1 0V14h1.5a.5.5 0 0 0 0-1H6v-1.5Z" fill="currentColor"></path>
                </svg>
              </span>
              <span className="albums-button-text">Create album</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="albums-grid-container">
          <div className="albums-grid">
            {albums.map((album) => (
              <div key={album.id} className="album-card">
                <div className="album-card-image">
                  {album.photos.length > 0 ? (
                    album.photos[0].type === 'image' ? (
                      <img src={album.photos[0].path} alt={album.name} />
                    ) : (
                      <video src={album.photos[0].path} />
                    )
                  ) : (
                    <div className="album-empty-thumbnail">
                      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 16h40a4 4 0 014 4v40a4 4 0 01-4 4H20a4 4 0 01-4-4V20a4 4 0 014-4z" stroke="white" strokeWidth="2" fill="none"/>
                        <circle cx="32" cy="32" r="6" stroke="white" strokeWidth="2" fill="none"/>
                        <path d="M16 52l16-16 12 12 20-20" stroke="white" strokeWidth="2" fill="none"/>
                      </svg>
                    </div>
                  )}

                  {/* Overlay text and actions */}
                  <div className="album-card-overlay">
                    <div className="album-card-info-row">
                      <div className="album-card-text">
                        <h3 className="album-card-title">{album.name}</h3>
                        <p className="album-card-info">
                          {album.photos.length} {album.photos.length === 1 ? 'item' : 'items'} • {formatAlbumDate(album.createdAt)}
                        </p>
                      </div>
                      <div className="album-card-actions">
                        <button
                          className="album-card-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAlbum(album.id);
                          }}
                          aria-label="Delete album"
                          title="Delete album"
                        >
                          <Delete20Regular />
                        </button>
                        <button
                          className="album-card-share"
                          aria-label="Share album"
                          title="Share album"
                        >
                          <Share20Regular />
                        </button>
                      </div>
                    </div>
                  </div>
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
                <button className="footer-expanded-upload">
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
                <button className="footer-expanded-album" onClick={handleCreateAlbum}>
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

      {/* Create Album Dialog */}
      {isDialogOpen && (
        <div className="album-dialog-overlay" onClick={handleCloseDialog}>
          <div className="album-dialog-container" onClick={(e) => e.stopPropagation()}>
            <div className="album-dialog-header">
              <button className="album-dialog-back" onClick={handleCloseDialog} aria-label="Back">
                <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.16 16.87a.5.5 0 1 0 .67-.74L3.67 10.5H17.5a.5.5 0 0 0 0-1H3.67l6.16-5.63a.5.5 0 0 0-.67-.74L2.24 9.44a.75.75 0 0 0 0 1.11l6.92 6.32Z" fill="currentColor"></path>
                </svg>
              </button>
              <h2 className="album-dialog-title">Name your album</h2>
              <button className="album-dialog-close" onClick={handleCloseDialog} aria-label="Close">
                <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="m4.09 4.22.06-.07a.5.5 0 0 1 .63-.06l.07.06L10 9.29l5.15-5.14a.5.5 0 0 1 .63-.06l.07.06c.18.17.2.44.06.63l-.06.07L10.71 10l5.14 5.15c.18.17.2.44.06.63l-.06.07a.5.5 0 0 1-.63.06l-.07-.06L10 10.71l-5.15 5.14a.5.5 0 0 1-.63.06l-.07-.06a.5.5 0 0 1-.06-.63l.06-.07L9.29 10 4.15 4.85a.5.5 0 0 1-.06-.63l.06-.07-.06.07Z" fill="currentColor"></path>
                </svg>
              </button>
            </div>

            <div className="album-dialog-body">
              <div className="album-dialog-icon">
                <img
                  src="https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/notebook_dark_4907ee26.png"
                  role="presentation"
                  alt=""
                />
              </div>

              <div className="album-dialog-input-container">
                <input
                  type="text"
                  maxLength={256}
                  spellCheck={false}
                  className="album-dialog-input"
                  value={albumName}
                  onChange={handleAlbumNameChange}
                  placeholder="Type album name"
                  autoFocus
                />

                <button
                  type="button"
                  className="album-dialog-next"
                  disabled={!albumName.trim()}
                  onClick={handleNext}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Select Photos Dialog */}
      {isSelectPhotosOpen && (
        <div className="select-photos-overlay" onClick={handleCloseSelectPhotos}>
          <div className="select-photos-container" onClick={(e) => e.stopPropagation()}>
            <div className="select-photos-header">
              <button className="select-photos-back" onClick={handleCloseSelectPhotos} aria-label="Back">
                <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.16 16.87a.5.5 0 1 0 .67-.74L3.67 10.5H17.5a.5.5 0 0 0 0-1H3.67l6.16-5.63a.5.5 0 0 0-.67-.74L2.24 9.44a.75.75 0 0 0 0 1.11l6.92 6.32Z" fill="currentColor"></path>
                </svg>
              </button>
              <h2 className="select-photos-title">Select photos</h2>
              <button className="select-photos-close" onClick={handleCloseSelectPhotos} aria-label="Close">
                <svg fill="currentColor" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="m4.09 4.22.06-.07a.5.5 0 0 1 .63-.06l.07.06L10 9.29l5.15-5.14a.5.5 0 0 1 .63-.06l.07.06c.18.17.2.44.06.63l-.06.07L10.71 10l5.14 5.15c.18.17.2.44.06.63l-.06.07a.5.5 0 0 1-.63.06l-.07-.06L10 10.71l-5.15 5.14a.5.5 0 0 1-.63.06l-.07-.06a.5.5 0 0 1-.06-.63l.06-.07L9.29 10 4.15 4.85a.5.5 0 0 1-.06-.63l.06-.07-.06.07Z" fill="currentColor"></path>
                </svg>
              </button>
            </div>

            <div className="select-photos-body">
              {Object.entries(groupGalleryItemsByDate(galleryItems)).map(([dateKey, items]) => (
                <div key={dateKey} className="select-photos-date-group">
                  <h3 className="select-photos-date-label">{dateKey}</h3>
                  <div className="select-photos-grid">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`select-photo-item ${selectedPhotos.has(item.id) ? 'selected' : ''}`}
                        onClick={() => togglePhotoSelection(item.id)}
                      >
                        {item.type === 'image' ? (
                          <img
                            src={item.path}
                            alt={item.name}
                            className="select-photo-image"
                          />
                        ) : (
                          <video
                            src={item.path}
                            className="select-photo-video"
                            preload="metadata"
                          />
                        )}
                        <div className="select-photo-checkbox">
                          {item.type === 'video' && (
                            <div className="video-play-icon">
                              <svg width="20" height="20" viewBox="0 0 20 20" fill="white" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6 4.5v11l9-5.5-9-5.5z" fill="white"/>
                              </svg>
                            </div>
                          )}
                          {selectedPhotos.has(item.id) && (
                            <div className="select-photo-check-circle">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.765 5.20474C12.0661 5.48915 12.0797 5.96383 11.7953 6.26497L7.54526 10.765C7.40613 10.9123 7.21332 10.997 7.01071 10.9999C6.8081 11.0028 6.61295 10.9236 6.46967 10.7803L4.21967 8.53033C3.92678 8.23744 3.92678 7.76257 4.21967 7.46967C4.51256 7.17678 4.98744 7.17678 5.28033 7.46967L6.98463 9.17397L10.7047 5.23503C10.9891 4.9339 11.4638 4.92033 11.765 5.20474Z" fill="white"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="select-photos-footer">
              <button
                className="select-photos-done"
                onClick={handleCreateWithPhotos}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
