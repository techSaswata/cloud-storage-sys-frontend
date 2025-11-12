'use client';

import { useEffect, useState } from 'react';
import { ArrowExpand20Regular } from '@fluentui/react-icons';
import './UploadStatusPopup.css';

export type OperationType =
  | 'uploading'
  | 'upload-done'
  | 'creating-album'
  | 'album-created'
  | 'deleting-file'
  | 'file-deleted'
  | 'deleting-folder'
  | 'folder-deleted'
  | 'moving'
  | 'moved'
  | 'copying'
  | 'copied'
  | 'restoring'
  | 'restored';

interface UploadStatusPopupProps {
  operation: OperationType;
  itemName?: string;
  progress?: number;
  location?: string;
  count?: number; // For multiple items
  onClose?: () => void;
  onSeeDetails?: () => void;
  isPhotosTab?: boolean;
}

const UploadStatusPopup = ({
  operation,
  itemName = '',
  progress = 0,
  location = 'My files',
  count = 1,
  onClose,
  onSeeDetails,
  isPhotosTab = false
}: UploadStatusPopupProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  // Check if operation is in "done" state
  const isDone = operation.endsWith('-done') ||
                 operation.endsWith('-created') ||
                 operation.endsWith('-deleted') ||
                 operation.endsWith('moved') ||
                 operation.endsWith('copied') ||
                 operation.endsWith('restored');

  // Check if operation shows progress
  const showProgress = operation === 'uploading' ||
                       operation === 'moving' ||
                       operation === 'copying';

  // Get message based on operation type
  const getMessage = () => {
    const itemText = count > 1 ? `${count} items` : itemName;

    switch (operation) {
      case 'uploading':
        return (
          <>
            Uploading <span className="file-name">{itemText}</span> to{' '}
            <button type="button" className="location-link">{location}</button>
          </>
        );
      case 'upload-done':
        return (
          <>
            <span className="file-name">{itemText}</span> uploaded to{' '}
            <button type="button" className="location-link">{location}</button>
          </>
        );
      case 'creating-album':
        return (
          <>
            Creating album <span className="file-name">{itemName}</span>
          </>
        );
      case 'album-created':
        return (
          <>
            Album <span className="file-name">{itemName}</span> created
          </>
        );
      case 'deleting-file':
        return (
          <>
            Deleting <span className="file-name">{itemText}</span>
          </>
        );
      case 'file-deleted':
        return (
          <>
            <span className="file-name">{itemText}</span> deleted
          </>
        );
      case 'deleting-folder':
        return (
          <>
            Deleting folder <span className="file-name">{itemName}</span>
          </>
        );
      case 'folder-deleted':
        return (
          <>
            Folder <span className="file-name">{itemName}</span> deleted
          </>
        );
      case 'moving':
        return (
          <>
            Moving <span className="file-name">{itemText}</span> to{' '}
            <button type="button" className="location-link">{location}</button>
          </>
        );
      case 'moved':
        return (
          <>
            <span className="file-name">{itemText}</span> moved to{' '}
            <button type="button" className="location-link">{location}</button>
          </>
        );
      case 'copying':
        return (
          <>
            Copying <span className="file-name">{itemText}</span>
          </>
        );
      case 'copied':
        return (
          <>
            <span className="file-name">{itemText}</span> copied
          </>
        );
      case 'restoring':
        return (
          <>
            Restoring <span className="file-name">{itemText}</span>
          </>
        );
      case 'restored':
        return (
          <>
            <span className="file-name">{itemText}</span> restored
          </>
        );
      default:
        return null;
    }
  };

  // Auto-hide after 5 seconds when operation is done
  useEffect(() => {
    if (isDone) {
      const timer = setTimeout(() => {
        setIsAnimatingOut(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose?.();
        }, 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isDone, onClose]);

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className={`upload-status-popup ${isPhotosTab ? 'above-footer' : ''} ${isAnimatingOut ? 'slide-out' : ''}`}>
      <div className="upload-status-container">
        {/* Status Icon */}
        <div className="status-icon-wrapper">
          {!isDone ? (
            <svg
              className="spinner-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M10 2a8 8 0 100 16 8 8 0 000-16z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.25"
              />
              <path
                d="M10 2a8 8 0 018 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              className="checkmark-icon"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
            >
              <path
                d="M10 2a8 8 0 100 16 8 8 0 000-16z"
                fill="#107C10"
              />
              <path
                d="M6 10l2.5 2.5L14 7"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        {/* Main Content */}
        <div className="main-content">
          <div className="message-row">
            <div className="message-text">
              {getMessage()}
            </div>
          </div>

          {/* Progress Bar for operations that show progress */}
          {showProgress && (
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* See Details Button */}
        <button
          type="button"
          aria-label="See details"
          title="See details"
          className="see-details-btn"
          onClick={onSeeDetails}
        >
          <ArrowExpand20Regular />
        </button>

        {/* Close Button - only show when done */}
        {isDone && (
          <button
            type="button"
            aria-label="Close"
            title="Close"
            className="close-btn"
            onClick={handleClose}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M6 4.82L10.59.23l1.18 1.18L7.18 6l4.59 4.59-1.18 1.18L6 7.18l-4.59 4.59L.23 10.59 4.82 6 .23 1.41 1.41.23 6 4.82z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default UploadStatusPopup;
