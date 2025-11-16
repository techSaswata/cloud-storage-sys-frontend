'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useUser } from '@/contexts/UserContext';
import { useSidebar } from '@/contexts/SidebarContext';
import './Sidebar.css';
import CreateUploadDropdown from './CreateUploadDropdown';
import BrowseFilesBy from './BrowseFilesBy';
import {
  Folder24Regular,
  Folder24Filled,
  People24Regular,
  People24Filled,
  Clock24Regular,
  Image24Regular,
  Delete24Regular,
  Delete24Filled,
  Star24Regular,
  Home24Regular,
  Home24Filled,
  Add24Filled,
  Person24Regular,
  Person24Filled,
  PanelRightExpand20Regular,
  PanelLeftExpand20Regular,
  ChevronDown12Regular,
  ChevronUp12Regular,
  Search24Regular,
  Search24Filled
} from '@fluentui/react-icons';

interface SidebarProps {
  activeView?: string;
  currentFolderId?: string | null;
  currentPath?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView = '1', currentFolderId = null, currentPath = '' }) => {
  const { name } = useUser();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isBrowseExpanded, setIsBrowseExpanded] = useState(true);
  const uploadButtonRef = useRef<HTMLButtonElement>(null);

  const handleUploadClick = () => {
    if (uploadButtonRef.current) {
      const rect = uploadButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 5,
        left: rect.left
      });
      setIsDropdownOpen(!isDropdownOpen);
    }
  };

  return (
    <div
      className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
    >
      <div className="sidebar-content">
        {/* Upload Button */}
        {!isCollapsed ? (
          <button
            ref={uploadButtonRef}
            className="upload-btn"
            type="button"
            role="button"
            onClick={handleUploadClick}
          >
            <span className="upload-icon">
              <Add24Filled />
            </span>
            <span className="upload-text">Create or upload</span>
          </button>
        ) : (
          <button
            ref={uploadButtonRef}
            className="upload-btn-collapsed"
            type="button"
            role="button"
            onClick={handleUploadClick}
            title="Create or upload"
          >
            <Add24Filled />
          </button>
        )}

        {/* Dropdown Menu */}
        <CreateUploadDropdown
          isOpen={isDropdownOpen}
          onClose={() => setIsDropdownOpen(false)}
          position={dropdownPosition}
          currentPath={currentPath}
        />

        {/* Navigation Section */}
        <div className="nav-group">
          {!isCollapsed && (
            <div className="nav-header">
              <span className="nav-username">{name || 'User'}</span>
              <button
                className="nav-header-icon"
                style={{ opacity: isSidebarHovered ? 1 : 0 }}
                onClick={toggleSidebar}
                title="Collapse sidebar"
              >
                <PanelRightExpand20Regular />
              </button>
            </div>
          )}
          {isCollapsed && (
            <div className="nav-header-collapsed">
              <button
                className="nav-header-icon-collapsed"
                onClick={toggleSidebar}
                title="Expand sidebar"
              >
                <PanelLeftExpand20Regular />
              </button>
            </div>
          )}
          <ul className="nav-list" role="list">
            {/* <li className={`nav-item ${activeView === '1' ? 'nav-item-active' : ''}`} role="listitem">
              <Link href="/home" className="nav-link" title={isCollapsed ? "Home" : ""}>
                <span className="nav-icon-wrapper">
                  {activeView === '1' ? <Home24Filled /> : <Home24Regular />}
                </span>
                {!isCollapsed && <span className="nav-text">Home</span>}
              </Link>
            </li> */}
            <li className={`nav-item ${activeView === '0' ? 'nav-item-active' : ''}`} role="listitem">
              <Link href="/myfiles" className="nav-link" title={isCollapsed ? "My files" : ""}>
                <span className="nav-icon-wrapper">
                  {activeView === '0' ? <Folder24Filled /> : <Folder24Regular />}
                </span>
                {!isCollapsed && <span className="nav-text">My files</span>}
              </Link>
            </li>
            <li className={`nav-item ${activeView === 'search' ? 'nav-item-active' : ''}`} role="listitem">
              <Link href="/search" className="nav-link" title={isCollapsed ? "Search" : ""}>
                <span className="nav-icon-wrapper">
                  {activeView === 'search' ? <Search24Filled /> : <Search24Regular />}
                </span>
                {!isCollapsed && <span className="nav-text">Search</span>}
              </Link>
            </li>
            <li className={`nav-item ${activeView === '3' ? 'nav-item-active' : ''}`} role="listitem">
              <Link href="/shared" className="nav-link" title={isCollapsed ? "Shared" : ""}>
                <span className="nav-icon-wrapper">
                  {activeView === '3' ? <People24Filled /> : <People24Regular />}
                </span>
                {!isCollapsed && <span className="nav-text">Shared</span>}
              </Link>
            </li>
            <li className={`nav-item ${activeView === '5' ? 'nav-item-active' : ''}`} role="listitem">
              <Link href="/recycle-bin" className="nav-link" title={isCollapsed ? "Recycle bin" : ""}>
                <span className="nav-icon-wrapper">
                  {activeView === '5' ? <Delete24Filled /> : <Delete24Regular />}
                </span>
                {!isCollapsed && <span className="nav-text">Recycle bin</span>}
              </Link>
            </li>
          </ul>
        </div>

        {/* Browse Files By Section */}
        {/* {!isCollapsed && <BrowseFilesBy activeView={activeView} isHovered={isSidebarHovered} />} */}

        {/* Collapsed Browse Section - Chevron and People Icon */}
        {/* {isCollapsed && (
          <div className="collapsed-browse-section">
            <button
              className={`collapsed-browse-chevron ${!isBrowseExpanded ? 'collapsed' : ''}`}
              onClick={() => setIsBrowseExpanded(!isBrowseExpanded)}
              title={isBrowseExpanded ? "Collapse" : "Expand"}
            >
              <ChevronDown12Regular />
            </button>
            {isBrowseExpanded && (
              <Link href="/people" className={`collapsed-browse-icon ${activeView === '33' ? 'collapsed-browse-icon-active' : ''}`} title="People">
                {activeView === '33' ? <Person24Filled /> : <Person24Regular />}
              </Link>
            )}
          </div>
        )} */}

        {/* Collapsed Footer Section */}
        {/* {isCollapsed && (
          <div className="collapsed-footer">
            <div className="collapsed-storage-section">
              <button className="collapsed-buy-storage-button" title="Buy storage">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 2h8l4 6-8 10L2 8l4-6z" />
                </svg>
              </button>

              <div className="collapsed-storage-progress">
                <div className="collapsed-storage-progress-total"></div>
                <div className="collapsed-storage-progress-used" style={{ width: '1%' }}></div>
              </div>
            </div>

            <button className="collapsed-footer-icon" title="Settings">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M11.34 2.07A1.5 1.5 0 0 1 12.8 3.5v.05c0 .46.26.88.68 1.08.42.2.93.14 1.28-.21l.04-.04a1.5 1.5 0 0 1 2.12 0l.6.6a1.5 1.5 0 0 1 0 2.12l-.04.04a1.5 1.5 0 0 1-.21 1.28c.2.42.62.68 1.08.68h.05a1.5 1.5 0 0 1 1.5 1.5v.8a1.5 1.5 0 0 1-1.5 1.5h-.05a1.5 1.5 0 0 1-1.08.68 1.5 1.5 0 0 1 .21 1.28l.04.04a1.5 1.5 0 0 1 0 2.12l-.6.6a1.5 1.5 0 0 1-2.12 0l-.04-.04a1.5 1.5 0 0 1-1.28-.21 1.5 1.5 0 0 1-.68 1.08v.05a1.5 1.5 0 0 1-1.5 1.5h-.8a1.5 1.5 0 0 1-1.5-1.5v-.05c0-.46-.26-.88-.68-1.08a1.5 1.5 0 0 1-1.28.21l-.04.04a1.5 1.5 0 0 1-2.12 0l-.6-.6a1.5 1.5 0 0 1 0-2.12l.04-.04a1.5 1.5 0 0 1 .21-1.28A1.5 1.5 0 0 1 2.5 12.4v-.05a1.5 1.5 0 0 1-1.5-1.5v-.8a1.5 1.5 0 0 1 1.5-1.5h.05c.46 0 .88-.26 1.08-.68a1.5 1.5 0 0 1-.21-1.28l-.04-.04a1.5 1.5 0 0 1 0-2.12l.6-.6a1.5 1.5 0 0 1 2.12 0l.04.04c.35.35.86.41 1.28.21.2-.42.68-.62 1.08-.68V3.5c0-.83.67-1.5 1.5-1.5h.8c.66 0 1.22.43 1.42 1.07ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
              </svg>
            </button>
            <button className="collapsed-footer-icon" title="Help">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm0 1a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 10.5a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5Zm0-7.5a2.5 2.5 0 0 1 2.5 2.5c0 .86-.46 1.47-1.12 2.02l-.22.18c-.44.35-.66.6-.66 1.05a.5.5 0 1 1-1 0c0-.86.46-1.47 1.12-2.02l.22-.18c.44-.35.66-.6.66-1.05a1.5 1.5 0 0 0-3 0 .5.5 0 0 1-1 0A2.5 2.5 0 0 1 10 6Z" />
              </svg>
            </button>
          </div>
        )} */}

        {/* Storage Quota Section */}
        {/* {!isCollapsed && (
          <div className="storage-quota-section">
            <div className="storage-upsell-banner">
              <div className="storage-upsell-text">
                Get storage for all your files and photos.
              </div>
              <button className="buy-storage-button" title="Buy storage">
                <div className="storage-button-icon">
                <svg className="premium-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6 2h8l4 6-8 10L2 8l4-6z" />
                  </svg>

                </div>
                <div className="storage-button-text">Buy storage</div>
              </button>
            </div>

            <div className="storage-title">Storage</div>

            <div className="storage-progress">
              <div className="storage-progress-total"></div>
              <div className="storage-progress-used" style={{ width: '1%' }}></div>
            </div>

            <div className="storage-info">
              <div className="storage-text">
                <Link
                  className="storage-used-link"
                  href="/?v=managestorage&sw=bypassConfig"
                  aria-label="Storage: < 0.1 GB used of 5 GB (1%)"
                >
                  &lt; 0.1 GB
                </Link>
                <div className="storage-total-text">used of 5 GB (1%)</div>
              </div>
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
};

export default Sidebar;
