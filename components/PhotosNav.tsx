'use client';

import './PhotosNav.css';
import {
  Sparkle24Regular,
  Sparkle24Filled,
  Glance24Regular,
  Glance24Filled,
  Album24Regular,
  Album24Filled,
  Star24Regular,
  Star24Filled,
} from '@fluentui/react-icons';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function PhotosNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('gallery');

  // Update active tab based on current path
  useEffect(() => {
    if (pathname === '/moments') {
      setActiveTab('moments');
    } else if (pathname === '/albums') {
      setActiveTab('albums');
    } else if (pathname === '/favorites') {
      setActiveTab('favorites');
    } else if (pathname === '/gallery') {
      setActiveTab('gallery');
    }
  }, [pathname]);

  const tabs = [
    { id: 'moments', label: 'Moments', RegularIcon: Sparkle24Regular, FilledIcon: Sparkle24Filled },
    { id: 'gallery', label: 'Gallery', RegularIcon: Glance24Regular, FilledIcon: Glance24Filled },
    { id: 'albums', label: 'Albums', RegularIcon: Album24Regular, FilledIcon: Album24Filled },
    { id: 'favorites', label: 'Favorites', RegularIcon: Star24Regular, FilledIcon: Star24Filled },
  ];

  return (
    <div className="photos-nav-container">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="icon-gradient" x1="0%" y1="21.43%" x2="100%" y2="90.25%">
            <stop offset="0%" stopColor="rgb(74, 146, 255)" />
            <stop offset="100%" stopColor="rgb(163, 117, 255)" />
          </linearGradient>
        </defs>
      </svg>
      <ul role="list" className="photos-nav-list">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const href = `/${tab.id}`;

          return (
            <li
              key={tab.id}
              role="listitem"
              className={`photos-nav-item ${isActive ? 'active' : ''}`}
              data-automationid={`topNav-${tab.id}`}
            >
              <div className="photos-nav-link-inner">
                <a
                  className={`photos-nav-button ${isActive ? 'is-selected' : ''}`}
                  title={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                  role="link"
                  tabIndex={0}
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(href);
                  }}
                >
                  <div className="photos-nav-icon-container">
                    <i className="photos-nav-icon default-icon">
                      <tab.RegularIcon />
                    </i>
                    <i className="photos-nav-icon selected-icon">
                      <tab.FilledIcon />
                    </i>
                    <i className="photos-nav-icon hover-icon">
                      <tab.FilledIcon />
                    </i>
                  </div>
                  <span className="photos-nav-text">
                    <div className="photos-nav-text-ellipsis">{tab.label}</div>
                  </span>
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
