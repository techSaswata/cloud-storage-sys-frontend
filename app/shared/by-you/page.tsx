'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PromoBanner from '@/components/PromoBanner';
import SharedByYouView from '@/components/SharedByYouView';
import { useEffect } from 'react';
import '@/components/Sidebar.css';

export default function SharedByYouPage() {
  useEffect(() => {
    document.title = 'Shared by you - OneDrive';
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
      <Header />
      <Sidebar activeView="20" />
      <main className="pt-0 pb-0 pl-0 pr-8" style={{ marginLeft: '270px', backgroundColor: '#141414', minHeight: 'calc(100vh - 55px)', marginTop: '20px' }}>
        <PromoBanner />
        <SharedByYouView />
      </main>
    </div>
  );
}
