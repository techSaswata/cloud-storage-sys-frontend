'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import './SharedWithMeView.css';

const SharedWithMeView: React.FC = () => {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filters = [
    { id: 'all', label: 'All', icon: null },
    { id: 'folder', label: 'Folder', icon: 'https://res-1.cdn.office.net/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/folder.svg' },
    { id: 'word', label: 'Word', icon: 'https://res-1.cdn.office.net/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/word_16x1.svg' },
    { id: 'excel', label: 'Excel', icon: 'https://res-1.cdn.office.net/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/excel_16x1.svg' },
    { id: 'powerpoint', label: 'PowerPoint', icon: 'https://res-1.cdn.office.net/files/fabric-cdn-prod_20251008.001/assets/brand-icons/product/svg/powerpoint_16x1.svg' },
    { id: 'pdf', label: 'PDF', icon: 'https://res-1.cdn.office.net/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/16/pdf.svg' }
  ];

  return (
    <div className="shared-with-me-container">
      {/* Action Row Container */}
      <div className="action-row-container">
        {/* Tab Navigation */}
        <div className="tab-list" role="tablist">
          <button
            aria-controls="sharedWithMeListContainer"
            aria-selected={true}
            className="tab tab-selected"
            role="tab"
            tabIndex={0}
            type="button"
          >
            <span>With you</span>
          </button>
          <button
            aria-controls="sharedWithMeListContainer"
            aria-selected={false}
            className="tab tab-unselected"
            role="tab"
            tabIndex={0}
            type="button"
            onClick={() => router.push('/shared/by-you')}
          >
            <span>By you</span>
          </button>
        </div>

        {/* Action Row with Filters and Search */}
        <div className="action-row">
          {/* Filter Pivot */}
          <ul role="tablist" className="filter-pivot">
            {filters.map((filter, index) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                data-index={index}
                aria-controls="sharedWithMeListContainer"
                aria-selected={selectedFilter === filter.id}
                className={`filter-button ${selectedFilter === filter.id ? 'filter-button-selected' : ''}`}
                onClick={() => setSelectedFilter(filter.id)}
              >
                {filter.icon && (
                  <img src={filter.icon} alt="" className="filter-icon" />
                )}
                <span>{filter.label}</span>
              </button>
            ))}
          </ul>
        </div>

        {/* Search Box */}
        <div role="search" className="search-box" aria-label="Filter by name or person">
          <input
            placeholder="Filter by name or person"
            role="searchbox"
            aria-label="Filter by name or person"
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area" role="tabpanel">
        <div className="empty-content" role="alert">
          <div className="empty-content-title">Shared files will show up here</div>
          <img
            src="https://res-1.cdn.office.net/files/sp-client/odsp-media-1e7b49f2/images/emptyfolder/empty_shared_v3_dark.webp"
            alt="A paper airplane coming out of a folder with files"
            aria-hidden="true"
            className="empty-content-image"
          />
        </div>
      </div>
    </div>
  );
};

export default SharedWithMeView;
