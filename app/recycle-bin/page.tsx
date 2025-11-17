'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PromoBanner from '@/components/PromoBanner';
import RecycleBinView from '@/components/RecycleBinView';
import MainContent from '@/components/MainContent';
import { useEffect } from 'react';
import '@/components/Sidebar.css';

export default function RecycleBinPage() {
  useEffect(() => {
    document.title = 'Recycle bin - OneDrive';
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
      <Header />
      <Sidebar activeView="5" />
      <MainContent>
        {/* <PromoBanner /> */}
        <RecycleBinView />
      </MainContent>
    </div>
  );
}
