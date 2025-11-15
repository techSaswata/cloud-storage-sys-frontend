'use client';

import { useState } from 'react';
import MyFilesHeader from './MyFilesHeader';
import MyFilesView from './MyFilesView';
import { useFiles } from '@/contexts/FilesContext';

interface MyFilesContainerProps {
  currentFolderId: string | null;
  setCurrentFolderId: (folderId: string | null) => void;
}

const MyFilesContainer: React.FC<MyFilesContainerProps> = ({ currentFolderId, setCurrentFolderId }) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const { files: allFiles } = useFiles();

  return (
    <>
      <MyFilesHeader
        isInsideFolder={currentFolderId !== null}
        selectedCount={selectedFiles.size}
        onClearSelection={() => setSelectedFiles(new Set())}
        selectedFiles={selectedFiles}
        currentFolderId={currentFolderId}
        allFiles={allFiles}
      />
      <MyFilesView
        currentFolderId={currentFolderId}
        setCurrentFolderId={setCurrentFolderId}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
      />
    </>
  );
};

export default MyFilesContainer;
