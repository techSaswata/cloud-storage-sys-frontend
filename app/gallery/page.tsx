'use client';

import Header from '@/components/Header';
import PhotosView from '@/components/PhotosView';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect } from 'react';

export default function GalleryPage() {
  useEffect(() => {
    document.title = 'Gallery - OneDrive';
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
        <Header />
        <main className="pt-0 pb-0 pl-0 pr-0" style={{ backgroundColor: '#141414', minHeight: 'calc(100vh - 55px)' }}>
          <PhotosView />
        </main>
      </div>
    </ProtectedRoute>
  );
}
