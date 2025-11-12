'use client';

import Header from '@/components/Header';
import AlbumsView from '@/components/AlbumsView';
import { useEffect } from 'react';

export default function AlbumsPage() {
  useEffect(() => {
    document.title = 'Albums - OneDrive';
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
      <Header />
      <main className="pt-0 pb-0 pl-0 pr-0" style={{ backgroundColor: '#141414', minHeight: 'calc(100vh - 55px)' }}>
        <AlbumsView />
      </main>
    </div>
  );
}
