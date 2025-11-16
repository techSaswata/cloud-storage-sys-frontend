'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import './SemanticSearchBar.css';

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  showFilters?: boolean;
  className?: string;
}

interface SearchSuggestion {
  query: string;
  category: string;
}

const SEARCH_SUGGESTIONS: SearchSuggestion[] = [
  { query: 'sunset photos', category: 'Images' },
  { query: 'meeting notes from last week', category: 'Documents' },
  { query: 'Python authentication code', category: 'Code' },
  { query: 'birthday party video', category: 'Videos' },
  { query: 'customer data', category: 'Data' },
  { query: 'podcast about technology', category: 'Audio' },
];

export default function SemanticSearchBar({
  onSearch,
  placeholder = "Search all your files: 'sunset photos', 'meeting notes', 'Python code'...",
  autoFocus = false,
  showFilters = false,
  className = '',
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Save to recent searches
  const saveToRecent = (searchQuery: string) => {
    const updated = [searchQuery, ...recentSearches.filter(q => q !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (!finalQuery.trim()) return;

    saveToRecent(finalQuery);

    if (onSearch) {
      onSearch(finalQuery);
    } else {
      // Navigate to search page
      router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
    }

    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleClearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className={`semantic-search-bar ${className}`}>
      <div className={`search-input-container ${isFocused ? 'focused' : ''}`}>
        {/* Search Icon */}
        <svg
          className="search-icon"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM18 18l-4.35-4.35"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          onBlur={() => {
            setIsFocused(false);
            // Delay to allow click on suggestions
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
        />

        {/* Clear Button */}
        {query && (
          <button
            className="clear-button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M12 4L4 12M4 4l8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        {/* Search Button */}
        <button
          className="search-button"
          onClick={() => handleSearch()}
          disabled={!query.trim()}
        >
          Search
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && (isFocused || query.length > 0) && (
        <div className="search-suggestions">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="suggestions-section">
              <div className="suggestions-header">
                <span className="suggestions-title">Recent Searches</span>
                <button className="clear-recent-button" onClick={handleClearRecent}>
                  Clear
                </button>
              </div>
              {recentSearches.map((recent, index) => (
                <button
                  key={index}
                  className="suggestion-item recent-search"
                  onClick={() => handleSearch(recent)}
                >
                  <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M8 5v3l2 2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{recent}</span>
                </button>
              ))}
            </div>
          )}

          {/* Example Searches */}
          {!query && (
            <div className="suggestions-section">
              <div className="suggestions-header">
                <span className="suggestions-title">Try Searching For</span>
              </div>
              {SEARCH_SUGGESTIONS.map((suggestion, index) => (
                <button
                  key={index}
                  className="suggestion-item example-search"
                  onClick={() => {
                    setQuery(suggestion.query);
                    handleSearch(suggestion.query);
                  }}
                >
                  <svg className="suggestion-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM8 6v4m0-6v.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="suggestion-query">{suggestion.query}</span>
                  <span className="suggestion-category">{suggestion.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filters (optional) */}
      {showFilters && (
        <div className="search-filters">
          <button className="filter-chip active">All Files</button>
          <button className="filter-chip">Images</button>
          <button className="filter-chip">Videos</button>
          <button className="filter-chip">Documents</button>
          <button className="filter-chip">Code</button>
          <button className="filter-chip">Audio</button>
          <button className="filter-chip">Data</button>
        </div>
      )}
    </div>
  );
}

