'use client';

import { useState } from 'react';
import { Gift24Regular } from '@fluentui/react-icons';
import './PromoBanner.css';

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="promo-banner-wrapper">
      <div className="promo-banner-container">
        <div className="promo-banner-content">
          <div className="promo-banner-inner">
            <div className="promo-text-container">
              <span className="promo-message">
                <Gift24Regular style={{ color: '#0078D4', marginRight: '8px', verticalAlign: 'middle' }} />
                <span className="promo-title">Get 100 GB free for a month</span>
                <span className="promo-description">
                  Start your trial now to get more storage for all your files and photos.
                </span>
              </span>
            </div>
            <div className="promo-actions">
              <div className="promo-button-wrapper">
                <button type="button" className="promo-button">
                  <span className="promo-button-text">Start free trial</span>
                </button>
              </div>
            </div>
            <div className="promo-dismiss">
              <button
                type="button"
                className="promo-dismiss-button"
                onClick={() => setIsVisible(false)}
                aria-label="Dismiss banner"
              >
                <span className="promo-dismiss-icon">✕</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
