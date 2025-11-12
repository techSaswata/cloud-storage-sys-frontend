'use client';

import React, { useState } from 'react';
import './PeopleView.css';

const PeopleView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="people-container" role="main" data-automationid="mainContainer">
      {/* Header with Title and Search */}
      <div className="people-header" data-automationid="headerContainer">
        <h2 className="people-title">People</h2>

        <div role="search" className="people-search-box" aria-label="Filter by person">
          <input
            placeholder="Filter by person"
            role="searchbox"
            aria-label="Filter by person"
            className="people-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="people-content" data-automationid="contentContainer" data-testid="contentContainer">
        <div className="people-empty-content" data-automationid="onedrive-emptycontent" role="alert">
          <div className="people-empty-title">People have yet to share files with you</div>
          <img
            src="https://res-1.cdn.office.net/files/sp-client/odsp-media-1e7b49f2/images/emptyfolder/empty_shared_v3_dark.webp"
            alt="Two contact cards"
            aria-hidden="true"
            className="people-empty-image"
          />
        </div>
      </div>
    </div>
  );
};

export default PeopleView;
