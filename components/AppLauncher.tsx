'use client';

import { useState } from 'react';
import './AppLauncher.css';

interface AppLauncherProps {
  isOpen: boolean;
  onClose: () => void;
}

const apps = [
  {
    name: 'Microsoft 365 Copilot',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/M365_24x_da036bc4.svg'
  },
  {
    name: 'Outlook',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/outlook_24x1_16f15926.svg'
  },
  {
    name: 'OneDrive',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/onedrive_24x1_3dca28ce.svg'
  },
  {
    name: 'Teams',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/teams_24x1_737122d8.svg'
  },
  {
    name: 'Word',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/word_24x1_4f14d4f1.svg'
  },
  {
    name: 'Excel',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/excel_24x1_ef67616b.svg'
  },
  {
    name: 'PowerPoint',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/powerpoint_24x1_088c0a01.svg'
  },
  {
    name: 'OneNote',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/onenote_24x1_917c6a51.svg'
  },
  {
    name: 'To Do',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/todo_24x1_22d5b93f.svg'
  },
  {
    name: 'Family Safety',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/FamilySafety_24x_449a71b9.svg'
  },
  {
    name: 'Calendar',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/Calendar_24x_e50a5ecb.svg'
  },
  {
    name: 'Clipchamp',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/clipchamp_24x1_2eb14be3.svg'
  },
  {
    name: 'Designer',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/Designer_24x_ac7eb4e6.svg'
  },
  {
    name: 'Skype',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/Skype_24x_905a0e94.svg'
  },
  {
    name: 'More apps',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/MoreAppsDark_50f3694f.svg'
  },
];

const createOptions = [
  {
    name: 'Document',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/word_24x1_4f14d4f1.svg'
  },
  {
    name: 'Workbook',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/excel_24x1_ef67616b.svg'
  },
  {
    name: 'Presentation',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/powerpoint_24x1_088c0a01.svg'
  },
  {
    name: 'Survey',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/forms_24x1_7713cded.svg'
  },
  {
    name: 'Create more',
    icon: 'https://res-1.cdn.office.net/files/odsp-web-prod_2025-10-17.010/odbspartan/images/CreateMore_f4049e25.svg'
  },
];

export default function AppLauncher({ isOpen, onClose }: AppLauncherProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <>
      <div className="app-launcher-backdrop" onClick={onClose} />
      <div className="app-launcher-popup">
        <div className="app-launcher-header">
          <div className="app-launcher-search">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8.5 3a5.5 5.5 0 0 1 4.23 9.02l4.12 4.13a.5.5 0 0 1-.63.76l-.07-.06-4.13-4.12A5.5 5.5 0 1 1 8.5 3Zm0 1a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
            </svg>
            <input
              type="text"
              placeholder="Find Microsoft 365 apps"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <button className="close-button" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.09 4.22a.75.75 0 0 1 1.06-.13l.08.07L10 8.94l4.77-4.78a.75.75 0 0 1 1.13.98l-.07.08L11.06 10l4.77 4.77a.75.75 0 0 1-.98 1.13l-.08-.07L10 11.06l-4.77 4.77a.75.75 0 0 1-1.13-.98l.07-.08L8.94 10 4.16 5.23a.75.75 0 0 1-.07-1.01z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="app-launcher-content">
          <div className="apps-grid">
            {apps.map((app, index) => (
              <button key={index} className="app-item">
                <div className="app-icon">
                  <img src={app.icon} alt={app.name} style={{ width: '32px', height: '32px' }} />
                </div>
                <span className="app-name">{app.name}</span>
              </button>
            ))}
          </div>

          <div className="divider" />

          <div className="create-grid">
            {createOptions.map((option, index) => (
              <button key={index} className="app-item">
                <div className="app-icon">
                  <img src={option.icon} alt={option.name} style={{ width: '32px', height: '32px' }} />
                </div>
                <span className="app-name">{option.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
