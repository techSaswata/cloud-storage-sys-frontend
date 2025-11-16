'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import PromoBanner from '@/components/PromoBanner';
import MyFilesContainer from '@/components/MyFilesContainer';
import MainContent from '@/components/MainContent';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useEffect, useState } from 'react';
import '@/components/Sidebar.css';

export default function MyFilesPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');

  useEffect(() => {
    document.title = 'My files - OneDrive';
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen" style={{ backgroundColor: '#141414' }}>
        <Header />
        <Sidebar activeView="0" currentFolderId={currentFolderId} currentPath={currentPath} />
        <MainContent>
          {/* <PromoBanner /> */}
          <MyFilesContainer 
            currentFolderId={currentFolderId} 
            setCurrentFolderId={setCurrentFolderId}
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
          />
        </MainContent>
      </div>
    </ProtectedRoute>
  );
}
