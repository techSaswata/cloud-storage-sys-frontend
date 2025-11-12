'use client';

import './ProfileMenu.css';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getLoggedInUserEmail, getNameFromEmail, getInitialsFromEmail } from '@/lib/userUtils';

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileMenu({ isOpen, onClose }: ProfileMenuProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('SD');

  useEffect(() => {
    // Prefer user from AuthContext
    if (user) {
      setUserEmail(user.email);
      setUserName(user.user_metadata?.name || getNameFromEmail(user.email));
      setUserInitials(
        user.user_metadata?.name
          ? user.user_metadata.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          : getInitialsFromEmail(user.email)
      );
    } else {
      // Fallback to legacy method
      const email = getLoggedInUserEmail();
      if (email) {
        setUserEmail(email);
        setUserName(getNameFromEmail(email));
        setUserInitials(getInitialsFromEmail(email));
      }
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      onClose();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if API call fails, redirect to login
      onClose();
      router.push('/login');
    }
  };

  const handleSignInDifferent = async () => {
    try {
      await signOut();
      onClose();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if API call fails, redirect to login
      onClose();
      router.push('/login');
    }
  };

  return (
    <>
      <div className="profile-menu-overlay" onClick={onClose} />
      <div className="profile-menu">
        <div className="profile-menu-header">
          <div className="microsoft-logo">
            <svg width="108" height="24" viewBox="0 0 108 24" fill="none">
              <rect width="11.4" height="11.4" fill="#F25022"/>
              <rect x="12.6" width="11.4" height="11.4" fill="#7FBA00"/>
              <rect y="12.6" width="11.4" height="11.4" fill="#00A4EF"/>
              <rect x="12.6" y="12.6" width="11.4" height="11.4" fill="#FFB900"/>
              <text x="28" y="17" fill="currentColor" fontSize="16" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontWeight="600">Microsoft</text>
            </svg>
          </div>
          <button className="sign-out-button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        <div className="profile-menu-content">
          <div className="profile-info-section">
            <div className="profile-avatar-large">
              <span className="profile-initials-large">{userInitials}</span>
            </div>
            <div className="profile-details">
              <h2 className="profile-name">{userName}</h2>
              <p className="profile-email">{userEmail}</p>
              <a href="#" className="view-account-link" onClick={(e) => e.preventDefault()}>
                View account
              </a>
            </div>
          </div>

          <button className="sign-in-different-account" onClick={handleSignInDifferent}>
            <div className="sign-in-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="#3B3B3B"/>
                <path d="M20 12C16.6863 12 14 14.6863 14 18C14 21.3137 16.6863 24 20 24C23.3137 24 26 21.3137 26 18C26 14.6863 23.3137 12 20 12Z" fill="#FFFFFF" opacity="0.7"/>
                <circle cx="28" cy="28" r="6" fill="#3B3B3B"/>
                <path d="M28 25V28M28 28V31M28 28H31M28 28H25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span>Sign in with a different account</span>
          </button>
        </div>
      </div>
    </>
  );
}
