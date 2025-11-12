'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getLoggedInUserEmail, saveLoggedInUserEmail, getNameFromEmail } from '@/lib/userUtils';

interface UserContextType {
  email: string;
  name: string;
  setUserEmail: (email: string) => void;
  isLoggedIn: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    // Load email from localStorage on mount and when storage changes
    const loadUserData = () => {
      const savedEmail = getLoggedInUserEmail();
      if (savedEmail) {
        setEmail(savedEmail);
        setName(getNameFromEmail(savedEmail));
      }
    };

    loadUserData();

    // Listen for storage changes (in case login happens in another tab or component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userEmail') {
        loadUserData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for changes (for same-tab updates)
    const interval = setInterval(loadUserData, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const setUserEmail = (newEmail: string) => {
    setEmail(newEmail);
    setName(getNameFromEmail(newEmail));
    saveLoggedInUserEmail(newEmail);
  };

  return (
    <UserContext.Provider
      value={{
        email,
        name,
        setUserEmail,
        isLoggedIn: !!email,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
