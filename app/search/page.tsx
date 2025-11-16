'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SemanticSearchBar from '../../components/SemanticSearchBar';
import SearchResults, { SearchResult } from '../../components/SearchResults';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import './search.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Wrap the search content in a component that uses useSearchParams
function SearchPageContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      // Not logged in, redirect to login
      window.location.href = '/login';
    }
  }, []);

  // Perform search
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setLoading(true);
    setError(null);

    try {
      // Get auth token (correct key)
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('You must be logged in to search');
        setLoading(false);
        // Redirect to login
        window.location.href = '/login';
        return;
      }

      // Build request body
      const requestBody: {
        query: string;
        file_types?: string[];
        limit: number;
      } = {
        query: searchQuery,
        limit: 50,
      };

      // Add file type filters
      if (selectedFilters.length > 0) {
        requestBody.file_types = selectedFilters;
      }

      // Call search API
      const response = await fetch(`${API_BASE_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          // Clear auth and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        } else {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.detail || 'Search failed');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      setResults(data.results || []);
      
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('q', searchQuery);
      window.history.pushState({}, '', url.toString());

    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Search on mount if query param exists
  useEffect(() => {
    if (queryParam) {
      handleSearch(queryParam);
    }
  }, []);

  const handleFilterToggle = (filter: string) => {
    setSelectedFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };

  return (
    <div className="app-container">
      <Sidebar />
      
      <div className="main-container">
        <Header />
        
        <div className="search-page">
          {/* Search Bar */}
          <div className="search-section">
            <h1 className="search-title">Search Your Files</h1>
            <p className="search-subtitle">
              Use natural language to find anything: &quot;sunset photos&quot;, &quot;meeting notes from June&quot;, &quot;Python code&quot;
            </p>
            
            <div className="search-bar-wrapper">
              <SemanticSearchBar
                onSearch={handleSearch}
                autoFocus={!queryParam}
              />
            </div>

            {/* Filters */}
            <div className="search-filters-section">
              <div className="filter-label">Filter by type:</div>
              <div className="filter-chips">
                {[
                  { id: 'image', label: 'Images', icon: '🖼️' },
                  { id: 'video', label: 'Videos', icon: '🎬' },
                  { id: 'document', label: 'Documents', icon: '📄' },
                  { id: 'code', label: 'Code', icon: '💻' },
                  { id: 'audio', label: 'Audio', icon: '🎵' },
                  { id: 'structured', label: 'Data', icon: '📊' },
                ].map(filter => (
                  <button
                    key={filter.id}
                    className={`filter-chip ${selectedFilters.includes(filter.id) ? 'active' : ''}`}
                    onClick={() => handleFilterToggle(filter.id)}
                  >
                    <span className="filter-icon">{filter.icon}</span>
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="search-error">
              <div className="error-icon">⚠️</div>
              <div className="error-message">{error}</div>
              <button className="error-retry" onClick={() => handleSearch(query)}>
                Try Again
              </button>
            </div>
          )}

          {/* Results */}
          {query && !error && (
            <div className="results-section">
              <SearchResults
                results={results}
                query={query}
                loading={loading}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>
          )}

          {/* Empty State (no search yet) */}
          {!query && !error && (
            <div className="search-empty-state">
              <div className="empty-icon">🔍</div>
              <h2>Start searching</h2>
              <p>Enter a search query above to find your files</p>
              
              <div className="search-examples">
                <h3>Example searches:</h3>
                <div className="examples-grid">
                  <div className="example-card" onClick={() => handleSearch('sunset photos')}>
                    <span className="example-icon">🖼️</span>
                    <span className="example-text">&quot;sunset photos&quot;</span>
                  </div>
                  <div className="example-card" onClick={() => handleSearch('meeting notes')}>
                    <span className="example-icon">📄</span>
                    <span className="example-text">&quot;meeting notes&quot;</span>
                  </div>
                  <div className="example-card" onClick={() => handleSearch('Python authentication')}>
                    <span className="example-icon">💻</span>
                    <span className="example-text">&quot;Python authentication&quot;</span>
                  </div>
                  <div className="example-card" onClick={() => handleSearch('birthday video')}>
                    <span className="example-icon">🎬</span>
                    <span className="example-text">&quot;birthday video&quot;</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="app-container">
        <div className="loading-page">
          <div className="spinner"></div>
          <p>Loading search...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}

