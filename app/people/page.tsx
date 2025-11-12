'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PromoBanner from '@/components/PromoBanner';
import PeopleView from '@/components/PeopleView';
import MainContent from '@/components/MainContent';
import { useEffect } from 'react';
import '@/components/Sidebar.css';

export default function PeoplePage() {
  useEffect(() => {
    document.title = 'People - OneDrive';
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
      <Header />
      <Sidebar activeView="33" />
      <MainContent>
        <PromoBanner />
        <PeopleView />
      </MainContent>
    </div>
  );
}
