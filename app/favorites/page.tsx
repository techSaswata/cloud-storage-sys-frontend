'use client';

import Header from '@/components/Header';
import FavoritesView from '@/components/FavoritesView';
import { useEffect } from 'react';

export default function FavoritesPage() {
  useEffect(() => {
    document.title = 'Favourites - OneDrive';
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
      <Header />
      <main className="pt-0 pb-0 pl-0 pr-0" style={{ backgroundColor: '#141414', minHeight: 'calc(100vh - 55px)' }}>
        <FavoritesView />
      </main>
    </div>
  );
}
