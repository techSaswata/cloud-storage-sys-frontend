'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PromoBanner from '@/components/PromoBanner';
import SharedWithMeView from '@/components/SharedWithMeView';
import MainContent from '@/components/MainContent';
import { useEffect } from 'react';
import '@/components/Sidebar.css';

export default function SharedPage() {
  useEffect(() => {
    document.title = 'Shared - OneDrive';
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
      <Header />
      <Sidebar activeView="3" />
      <MainContent>
        <PromoBanner />
        <SharedWithMeView />
      </MainContent>
    </div>
  );
}
