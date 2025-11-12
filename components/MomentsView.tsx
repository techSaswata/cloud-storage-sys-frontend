'use client';

import './PhotosView.css';
import { useState } from 'react';

export default function MomentsView() {
  const [showExpandedFooter, setShowExpandedFooter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="photos-view">
      <div className="photos-empty-state">
        <h1 className="photos-title">Explore highlights from your photo collection</h1>

        <p className="photos-subtitle">
          Add photos to relive special times, revisit favorite places, and celebrate what matters most.
        </p>

        <div className="photos-gradient-background">
          <div className="gradient-circle gradient-blue"></div>
          <div className="gradient-circle gradient-purple"></div>
          <img
            className="background-image"
            src="https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/moments_empty_6933b1d7.png"
            alt="Background"
          />
        </div>

        <div className="photos-actions">
          <button className="photo-action-button">
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

          <a
            className="photo-action-button"
            href="https://www.microsoft.com/en-us/microsoft-365/onedrive/mobile"
            target="_blank"
            rel="noopener noreferrer"
          >
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
          </a>
        </div>

        <input
          type="file"
          className="hidden-file-input"
          accept="image/*,video/*,.heic"
          multiple
        />
      </div>

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
    </div>
  );
}
