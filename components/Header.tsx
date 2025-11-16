'use client';

import './Header.css';
import { Diamond20Regular, Settings20Regular, Settings20Filled } from '@fluentui/react-icons';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLoggedInUserInitials } from '@/lib/userUtils';
import PhotosNav from './PhotosNav';
import ProfileMenu from './ProfileMenu';
import AppLauncher from './AppLauncher';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'photos' | 'files'>('files');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAppLauncherOpen, setIsAppLauncherOpen] = useState(false);
  const [userInitials, setUserInitials] = useState('SD');

  useEffect(() => {
    // Check if current path is a photos view
    const photosRoutes = ['/gallery', '/moments', '/albums', '/favorites'];
    if (photosRoutes.includes(pathname)) {
      setActiveView('photos');
    } else {
      setActiveView('files');
    }
  }, [pathname]);

  useEffect(() => {
    // Load user data - prefer AuthContext, fallback to localStorage
    if (user) {
      if (user.user_metadata?.name) {
        const initials = user.user_metadata.name
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        setUserInitials(initials);
      } else if (user.email) {
        const initials = user.email.slice(0, 2).toUpperCase();
        setUserInitials(initials);
      }
    } else {
      // Fallback to legacy method
      const initials = getLoggedInUserInitials();
      if (initials) {
        setUserInitials(initials);
      }
    }
  }, [user]);

  const handleToggle = (view: 'photos' | 'files') => {
    setActiveView(view);
    if (view === 'photos') {
      router.push('/gallery');
    } else {
      router.push('/home');
    }
  };

  return (
    <header className="onedrive-header">
      <div className="header-left">
        <button
          className="app-launcher"
          aria-label="App launcher"
          title="App launcher"
          onClick={() => setIsAppLauncherOpen(!isAppLauncherOpen)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.25 4C5.25 4.69036 4.69036 5.25 4 5.25C3.30964 5.25 2.75 4.69036 2.75 4C2.75 3.30964 3.30964 2.75 4 2.75C4.69036 2.75 5.25 3.30964 5.25 4ZM17.25 16C17.25 16.6904 16.6904 17.25 16 17.25C15.3096 17.25 14.75 16.6904 14.75 16C14.75 15.3096 15.3096 14.75 16 14.75C16.6904 14.75 17.25 15.3096 17.25 16ZM16 11.25C16.6904 11.25 17.25 10.6904 17.25 10C17.25 9.30964 16.6904 8.75 16 8.75C15.3096 8.75 14.75 9.30964 14.75 10C14.75 10.6904 15.3096 11.25 16 11.25ZM17.25 4C17.25 4.69036 16.6904 5.25 16 5.25C15.3096 5.25 14.75 4.69036 14.75 4C14.75 3.30964 15.3096 2.75 16 2.75C16.6904 2.75 17.25 3.30964 17.25 4ZM10 17.25C10.6904 17.25 11.25 16.6904 11.25 16C11.25 15.3096 10.6904 14.75 10 14.75C9.30964 14.75 8.75 15.3096 8.75 16C8.75 16.6904 9.30964 17.25 10 17.25ZM11.25 10C11.25 10.6904 10.6904 11.25 10 11.25C9.30964 11.25 8.75 10.6904 8.75 10C8.75 9.30964 9.30964 8.75 10 8.75C10.6904 8.75 11.25 9.30964 11.25 10ZM10 5.25C10.6904 5.25 11.25 4.69036 11.25 4C11.25 3.30964 10.6904 2.75 10 2.75C9.30964 2.75 8.75 3.30964 8.75 4C8.75 4.69036 9.30964 5.25 10 5.25ZM5.25 16C5.25 16.6904 4.69036 17.25 4 17.25C3.30964 17.25 2.75 16.6904 2.75 16C2.75 15.3096 3.30964 14.75 4 14.75C4.69036 14.75 5.25 15.3096 5.25 16ZM4 11.25C4.69036 11.25 5.25 10.6904 5.25 10C5.25 9.30964 4.69036 8.75 4 8.75C3.30964 8.75 2.75 9.30964 2.75 10C2.75 10.6904 3.30964 11.25 4 11.25Z" />
          </svg>
        </button>

        <svg className="onedrive-logo" width="36" height="36" viewBox="0 0 36 36" fill="none">
          <path d="M10.0612 10.0071C4.63381 10.0072 0.576899 14.4499 0.271484 19.3991C0.46055 20.4655 1.08197 22.5713 2.05512 22.4632C3.27156 22.328 6.33519 22.4632 8.94828 17.7326C10.8571 14.2769 14.7838 10.007 10.0612 10.0071Z" fill="url(#paint0_radial)" />
          <path d="M8.80561 11.8538C6.98126 14.7423 4.52553 18.8811 3.69671 20.1836C2.71151 21.7317 0.102357 21.074 0.318506 18.8549C0.297198 19.0351 0.280832 19.2167 0.269548 19.3995C-0.0873823 25.173 4.49016 29.9676 10.1863 29.9676C16.4643 29.9676 31.4367 22.1455 29.9215 14.3081C28.3245 9.70109 23.8357 6.39673 18.7486 6.39673C13.6615 6.39673 10.4012 9.32752 8.80561 11.8538Z" fill="url(#paint1_radial)" />
          <path d="M8.80561 11.8538C6.98126 14.7423 4.52553 18.8811 3.69671 20.1836C2.71151 21.7317 0.102357 21.074 0.318506 18.8549C0.297198 19.0351 0.280832 19.2167 0.269548 19.3995C-0.0873823 25.173 4.49016 29.9676 10.1863 29.9676C16.4643 29.9676 31.4367 22.1455 29.9215 14.3081C28.3245 9.70109 23.8357 6.39673 18.7486 6.39673C13.6615 6.39673 10.4012 9.32752 8.80561 11.8538Z" fill="url(#paint2_radial)" fillOpacity="0.4" />
          <path d="M8.80561 11.8538C6.98126 14.7423 4.52553 18.8811 3.69671 20.1836C2.71151 21.7317 0.102357 21.074 0.318506 18.8549C0.297198 19.0351 0.280832 19.2167 0.269548 19.3995C-0.0873823 25.173 4.49016 29.9676 10.1863 29.9676C16.4643 29.9676 31.4367 22.1455 29.9215 14.3081C28.3245 9.70109 23.8357 6.39673 18.7486 6.39673C13.6615 6.39673 10.4012 9.32752 8.80561 11.8538Z" fill="url(#paint3_radial)" />
          <path d="M8.80561 11.8538C6.98126 14.7423 4.52553 18.8811 3.69671 20.1836C2.71151 21.7317 0.102357 21.074 0.318506 18.8549C0.297198 19.0351 0.280832 19.2167 0.269548 19.3995C-0.0873823 25.173 4.49016 29.9676 10.1863 29.9676C16.4643 29.9676 31.4367 22.1455 29.9215 14.3081C28.3245 9.70109 23.8357 6.39673 18.7486 6.39673C13.6615 6.39673 10.4012 9.32752 8.80561 11.8538Z" fill="url(#paint4_radial)" fillOpacity="0.6" />
          <path d="M8.80561 11.8538C6.98126 14.7423 4.52553 18.8811 3.69671 20.1836C2.71151 21.7317 0.102357 21.074 0.318506 18.8549C0.297198 19.0351 0.280832 19.2167 0.269548 19.3995C-0.0873823 25.173 4.49016 29.9676 10.1863 29.9676C16.4643 29.9676 31.4367 22.1455 29.9215 14.3081C28.3245 9.70109 23.8357 6.39673 18.7486 6.39673C13.6615 6.39673 10.4012 9.32752 8.80561 11.8538Z" fill="url(#paint5_radial)" fillOpacity="0.9" />
          <path d="M10.0947 29.9703C10.0947 29.9703 25.0847 29.9998 27.6273 29.9998C32.2416 29.9998 35.75 26.2326 35.75 21.8368C35.75 17.4409 32.1712 13.6965 27.6274 13.6965C23.0835 13.6965 20.4668 17.0959 18.5015 20.8065C16.1984 25.1546 13.2606 29.9182 10.0947 29.9703Z" fill="url(#paint6_linear)" />
          <path d="M10.0947 29.9703C10.0947 29.9703 25.0847 29.9998 27.6273 29.9998C32.2416 29.9998 35.75 26.2326 35.75 21.8368C35.75 17.4409 32.1712 13.6965 27.6274 13.6965C23.0835 13.6965 20.4668 17.0959 18.5015 20.8065C16.1984 25.1546 13.2606 29.9182 10.0947 29.9703Z" fill="url(#paint7_radial)" fillOpacity="0.4" />
          <path d="M10.0947 29.9703C10.0947 29.9703 25.0847 29.9998 27.6273 29.9998C32.2416 29.9998 35.75 26.2326 35.75 21.8368C35.75 17.4409 32.1712 13.6965 27.6274 13.6965C23.0835 13.6965 20.4668 17.0959 18.5015 20.8065C16.1984 25.1546 13.2606 29.9182 10.0947 29.9703Z" fill="url(#paint8_radial)" fillOpacity="0.9" />
          <defs>
            <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientTransform="matrix(7.1693 8.5904 -11.9745 14.6167 0.944588 11.3042)" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4894FE" />
              <stop offset="0.695072" stopColor="#0934B3" />
            </radialGradient>
            <radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientTransform="matrix(-31.5168 36.3542 -27.7778 -22.3863 30.9814 -1.57881)" gradientUnits="userSpaceOnUse">
              <stop offset="0.165327" stopColor="#23C0FE" />
              <stop offset="0.534" stopColor="#1C91FF" />
            </radialGradient>
            <radialGradient id="paint2_radial" cx="0" cy="0" r="1" gradientTransform="matrix(-7.49194 -6.28953 -14.0142 17.4729 8.2044 11.9405)" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" />
              <stop offset="0.660528" stopColor="#ADC0FF" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="paint3_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(18.8411 23.5022) rotate(-139.764) scale(11.0257 16.7449)">
              <stop stopColor="#033ACC" />
              <stop offset="1" stopColor="#368EFF" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="paint4_radial" cx="0" cy="0" r="1" gradientTransform="matrix(9.61928 22.1983 -23.9653 10.3826 7.55695 5.651)" gradientUnits="userSpaceOnUse">
              <stop offset="0.592618" stopColor="#3464E3" stopOpacity="0" />
              <stop offset="1" stopColor="#033ACC" />
            </radialGradient>
            <radialGradient id="paint5_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(30.5935 0.933855) rotate(135) scale(35.5871 55.753)">
              <stop stopColor="#4BFDE8" />
              <stop offset="0.543937" stopColor="#4BFDE8" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="paint6_linear" x1="22.9303" y1="29.9833" x2="22.9303" y2="13.8899" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0086FF" />
              <stop offset="0.49" stopColor="#00BBFF" />
            </linearGradient>
            <radialGradient id="paint7_radial" cx="0" cy="0" r="1" gradientTransform="matrix(14.9901 5.94479 -18.9939 25.318 14.5206 15.6139)" gradientUnits="userSpaceOnUse">
              <stop stopColor="white" />
              <stop offset="0.785262" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="paint8_radial" cx="0" cy="0" r="1" gradientTransform="matrix(-16.7465 14.4333 -19.8515 -12.1758 35.2485 12.4329)" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4BFDE8" />
              <stop offset="0.584724" stopColor="#4BFDE8" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        <div className="view-toggle">
          <div className="toggle-track">
            <div className={`toggle-slider ${activeView === 'photos' ? 'left' : 'right'}`}></div>
            <button
              className={`toggle-button ${activeView === 'photos' ? 'active' : ''}`}
              data-view="photos"
              onClick={() => handleToggle('photos')}
            >
              Photos
            </button>
            <button
              className={`toggle-button ${activeView === 'files' ? 'active' : ''}`}
              data-view="files"
              onClick={() => handleToggle('files')}
            >
              Files
            </button>
          </div>
        </div>
      </div>

      <div className="header-center">
        {activeView === 'photos' ? (
          <PhotosNav />
        ) : (
          <div className="search-bar" role="search">
            <button className="search-icon-button" aria-label="search icon" tabIndex={-1}>
              <svg fill="currentColor" aria-hidden="true" width="20px" height="20px" viewBox="0 0 20 20">
                <path d="M8.5 3a5.5 5.5 0 0 1 4.23 9.02l4.12 4.13a.5.5 0 0 1-.63.76l-.07-.06-4.13-4.12A5.5 5.5 0 1 1 8.5 3Zm0 1a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
              </svg>
            </button>
            <input
              className="search-input"
              type="search"
              placeholder="Search"
              aria-label="Search"
            />
          </div>
        )}
      </div>

      <div className="header-right">
        <div className="header-buttons">
          {/* <div className="premium-button-container">
            <button className="premium-button" data-automationid="Premium" title="Get more storage" aria-label="Get more storage">
              <i className="premium-icon-wrapper">
              <svg className="premium-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 2h8l4 6-8 10L2 8l4-6z" />
                </svg>
              </i>
              <span className="premium-label">Get more storage</span>
            </button>
          </div> */}

          <div className="settings-button-container">
            <button className="settings-button" title="Settings" data-automationid="Settings" aria-haspopup="true">
              <Settings20Regular className="settings-icon-regular" />
              <Settings20Filled className="settings-icon-filled" />
            </button>
          </div>
        </div>

        <div className="user-profile">
          <button
            className="profile-button-wrapper"
            title="Account manager"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
          >
            <div className="profile-avatar-wrapper">
              <div className="profile-avatar">
                <span className="profile-initials">{userInitials}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <ProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
      />

      <AppLauncher
        isOpen={isAppLauncherOpen}
        onClose={() => setIsAppLauncherOpen(false)}
      />
    </header>
  );
}
