'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Person24Regular, Person24Filled, ChevronDown12Regular, ChevronUp12Regular } from '@fluentui/react-icons';
import './BrowseFilesBy.css';

interface BrowseFilesByProps {
  activeView?: string;
  isHovered?: boolean;
}

const BrowseFilesBy: React.FC<BrowseFilesByProps> = ({ activeView, isHovered }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="browse-files-by">
      <button
        className="browse-header"
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="browse-title">Browse files by</span>
        <span className="browse-chevron" style={{ opacity: isHovered ? 1 : 0 }}>
          {isExpanded ? <ChevronDown12Regular /> : <ChevronUp12Regular />}
        </span>
      </button>
      {isExpanded && (
        <div className="browse-items-container">
          <ul className="browse-items" role="list" aria-expanded={isExpanded} aria-label="Browse files by">
            <li className={`browse-item ${activeView === '33' ? 'browse-item-active' : ''}`} role="listitem">
              <div className="browse-link-wrapper">
                <Link href="/people" className="browse-link" title="People">
                  <span className="browse-link-content">
                    <span className="browse-icon-wrapper">
                      {activeView === '33' ? <Person24Filled /> : <Person24Regular />}
                    </span>
                    <div className="browse-text-wrapper">
                      <span className="browse-text">People</span>
                    </div>
                  </span>
                </Link>
              </div>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default BrowseFilesBy;
