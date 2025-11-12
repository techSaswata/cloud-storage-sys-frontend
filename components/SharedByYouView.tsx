'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import './SharedWithMeView.css';

const SharedByYouView: React.FC = () => {
  const router = useRouter();

  return (
    <div className="shared-with-me-container">
      {/* Action Row Container */}
      <div className="action-row-container">
        {/* Tab Navigation */}
        <div className="tab-list" role="tablist">
          <button
            aria-controls="sharedWithMeListContainer"
            aria-selected={false}
            className="tab tab-unselected"
            role="tab"
            tabIndex={0}
            type="button"
            onClick={() => router.push('/shared')}
          >
            <span>With you</span>
          </button>
          <button
            aria-controls="sharedWithMeListContainer"
            aria-selected={true}
            className="tab tab-selected"
            role="tab"
            tabIndex={0}
            type="button"
          >
            <span>By you</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="content-area" role="tabpanel">
        <div className="empty-content" role="alert">
          <div className="empty-content-title">Files you share will show up here</div>
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

export default SharedByYouView;
