'use client';

import React, { useEffect, useState } from 'react';
import './SearchResults.css';

export interface SearchResult {
  file_id: string;
  file_name: string;
  file_type: string;
  file_extension: string;
  file_size: number;
  created_at: string;
  similarity_score: number;
  s3_key: string;
  thumbnail_url?: string;
  preview_url?: string;
  download_url: string;
  resolution?: string;
  duration?: number;
  fps?: number;
  page_count?: number;
  language?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  loading?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export default function SearchResults({
  results,
  query,
  loading = false,
  viewMode = 'grid',
  onViewModeChange,
}: SearchResultsProps) {
  const [previewFile, setPreviewFile] = useState<SearchResult | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  const buildUrl = (path?: string | null) => {
    if (!path) return '';
    
    // Build full URL
    let fullUrl = path;
    if (!path.startsWith('http://') && !path.startsWith('https://')) {
      if (!path.startsWith('/')) {
        fullUrl = `${API_BASE_URL}/${path}`;
      } else {
        fullUrl = `${API_BASE_URL}${path}`;
      }
    }
    
    // Add auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      fullUrl = `${fullUrl}${separator}token=${token}`;
    }
    
    return fullUrl;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPreviewFile(null);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getFileIcon = (type: string, extension: string): string => {
    if (type === 'image') return '🖼️';
    if (type === 'video') return '🎬';
    if (type === 'audio') return '🎵';
    if (type === 'document') return '📄';
    if (type === 'code') return '💻';
    if (type === 'structured') return '📊';
    return '📁';
  };

  const getFileTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      image: 'Image',
      video: 'Video',
      audio: 'Audio',
      document: 'Document',
      code: 'Code',
      structured: 'Data',
    };
    return labels[type] || 'File';
  };

  const handleFileClick = (file: SearchResult) => {
    setPreviewFile(file);
  };

  const handleDownload = (file: SearchResult, inline = false) => {
    const url = buildUrl(inline ? file.preview_url : file.download_url);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  };

  const renderPreviewContent = (file: SearchResult) => {
    const previewSrc = buildUrl(file.preview_url || file.thumbnail_url || file.download_url);

    if (!previewSrc) {
      return (
        <div className="preview-fallback">
          <p>Preview not available for this file.</p>
          <button className="primary-btn" onClick={() => handleDownload(file)}>
            Download file
          </button>
        </div>
      );
    }

    switch (file.file_type) {
      case 'image':
        return <img src={previewSrc} alt={file.file_name} className="preview-media" />;
      case 'video':
        return <video controls src={previewSrc} className="preview-media" />;
      case 'audio':
        return <audio controls src={previewSrc} className="preview-audio" />;
      case 'document':
      case 'structured':
        return (
          <iframe
            src={previewSrc}
            className="preview-frame"
            title={file.file_name}
            sandbox="allow-scripts allow-same-origin"
          />
        );
      case 'code':
        return (
          <div className="preview-code">
            <p>Code preview not supported yet.</p>
            <button className="primary-btn" onClick={() => handleDownload(file, true)}>
              Open raw file
            </button>
          </div>
        );
      default:
        return (
          <div className="preview-fallback">
            <p>Preview not available for this file.</p>
            <button className="primary-btn" onClick={() => handleDownload(file)}>
              Download file
            </button>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="search-results-loading">
        <div className="spinner"></div>
        <p>Searching through your files...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="search-results-empty">
        <div className="empty-icon">🔍</div>
        <h3>No results found for &quot;{query}&quot;</h3>
        <p>Try different keywords or check your spelling</p>
        <div className="empty-suggestions">
          <p>Search tips:</p>
          <ul>
            <li>Use descriptive keywords: &quot;beach sunset&quot; instead of just &quot;photo&quot;</li>
            <li>Try searching by content: &quot;meeting notes&quot; or &quot;Python code&quot;</li>
            <li>Include dates: &quot;photos from last week&quot;</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results">
      {/* Results Header */}
      <div className="results-header">
        <div className="results-info">
          <span className="results-count">{results.length} results</span>
          <span className="results-query">for &quot;{query}&quot;</span>
        </div>

        {/* View Mode Toggle */}
        {onViewModeChange && (
          <div className="view-mode-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              aria-label="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="1" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
                <rect x="9" y="9" width="6" height="6" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              aria-label="List view"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="2" width="14" height="3" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="7" width="14" height="3" stroke="currentColor" strokeWidth="1.5" />
                <rect x="1" y="12" width="14" height="3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Results Grid/List */}
      <div className={`results-container ${viewMode}`}>
        {results.map((result) => (
          <div
            key={result.file_id}
            className="result-card"
            onClick={() => handleFileClick(result)}
          >
            {/* Thumbnail/Preview */}
            <div className="result-thumbnail">
              {result.thumbnail_url ? (
                <img
                  src={buildUrl(result.thumbnail_url)}
                  alt={result.file_name}
                  className="thumbnail-image"
                />
              ) : (
                <div className="thumbnail-placeholder">
                  <span className="file-icon-large">{getFileIcon(result.file_type, result.file_extension)}</span>
                </div>
              )}
              {/* Type Badge */}
              <div className="file-type-badge">{getFileTypeLabel(result.file_type)}</div>
              {/* Similarity Score */}
              {/* <div className="similarity-score">
                {Math.round(result.similarity_score * 100)}% match
              </div> */}
            </div>

            {/* File Info */}
            <div className="result-info">
              <h4 className="file-name" title={result.file_name}>
                {result.file_name}
              </h4>
              
              <div className="file-metadata">
                <span className="file-size">{formatFileSize(result.file_size)}</span>
                <span className="metadata-separator">•</span>
                <span className="file-date">{formatDate(result.created_at)}</span>
                
                {/* Type-specific metadata */}
                {result.resolution && (
                  <>
                    <span className="metadata-separator">•</span>
                    <span>{result.resolution}</span>
                  </>
                )}
                {result.duration && (
                  <>
                    <span className="metadata-separator">•</span>
                    <span>{Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, '0')}</span>
                  </>
                )}
                {result.page_count && (
                  <>
                    <span className="metadata-separator">•</span>
                    <span>{result.page_count} pages</span>
                  </>
                )}
                {result.language && (
                  <>
                    <span className="metadata-separator">•</span>
                    <span>{result.language}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="result-actions">
              <button
                className="action-button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(result);
                }}
                title="Download"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1v10m0 0l3-3m-3 3L5 8m-3 7h12"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      {previewFile && (
        <div className="preview-overlay" onClick={() => setPreviewFile(null)}>
          <div
            className="preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="preview-header">
              <div>
                <h3>{previewFile.file_name}</h3>
                <p>{getFileTypeLabel(previewFile.file_type)}</p>
              </div>
              <button className="close-btn" onClick={() => setPreviewFile(null)}>
                ✕
              </button>
            </div>
            <div className="preview-body">
              {renderPreviewContent(previewFile)}
            </div>
            <div className="preview-actions">
              <button className="secondary-btn" onClick={() => handleDownload(previewFile, true)}>
                Open in new tab
              </button>
              <button className="primary-btn" onClick={() => handleDownload(previewFile)}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

