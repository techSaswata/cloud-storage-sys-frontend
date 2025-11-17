'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PromoBanner from '@/components/PromoBanner';
import RecentFiles from '@/components/RecentFiles';
import MainContent from '@/components/MainContent';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect } from 'react';
import '@/components/Sidebar.css';

export default function HomePage() {
  useEffect(() => {
    document.title = 'Home - OneDrive';
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
        <Header />
        <Sidebar activeView="1" />
        <MainContent>
          {/* <PromoBanner /> */}
          <RecentFiles />
        </MainContent>
      </div>
    </ProtectedRoute>
  );
}
