export interface FileItem {
  id: string;
  name: string;
  location: string;
  type: 'all' | 'word' | 'excel' | 'powerpoint' | 'onenote' | 'pdf' | 'image' | 'video' | 'folder' | 'other';
  icon: string;
  size: number;
  uploadedAt: string;
  owner: string;
  path: string;
  isFolder?: boolean;
  itemCount?: number;
  parentId?: string | null; // null means root level
  deleted?: boolean; // true if file is in recycle bin
  deletedAt?: string; // timestamp when file was deleted
  originalLocation?: string; // original location before deletion
  lastOpenedAt?: string; // timestamp when file was last opened
  isFavorite?: boolean; // true if file is favorited
}

const STORAGE_KEY = 'onedrive-files';

export function getFileType(fileName: string): { type: FileItem['type']; icon: string } {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  const typeMap: Record<string, { type: FileItem['type']; icon: string }> = {
    'docx': { type: 'word', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/docx.svg' },
    'doc': { type: 'word', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/docx.svg' },
    'xlsx': { type: 'excel', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/xlsx.svg' },
    'xls': { type: 'excel', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/xlsx.svg' },
    'pptx': { type: 'powerpoint', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/pptx.svg' },
    'ppt': { type: 'powerpoint', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/pptx.svg' },
    'one': { type: 'onenote', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/onetoc.svg' },
    'onetoc': { type: 'onenote', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/onetoc.svg' },
    'onetoc2': { type: 'onenote', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/onetoc.svg' },
    'pdf': { type: 'pdf', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/pdf.svg' },
    'png': { type: 'image', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/photo.svg' },
    'jpg': { type: 'image', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/photo.svg' },
    'jpeg': { type: 'image', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/photo.svg' },
    'gif': { type: 'image', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/photo.svg' },
    'mp4': { type: 'video', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/video.svg' },
    'mov': { type: 'video', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/video.svg' },
    'avi': { type: 'video', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/video.svg' },
    'mkv': { type: 'video', icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/video.svg' },
  };

  return typeMap[ext] || {
    type: 'other',
    icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/genericfile.svg'
  };
}

export function getAllFiles(): FileItem[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveFile(file: FileItem): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  files.unshift(file);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export function deleteFile(id: string): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const updatedFiles = files.map(file => {
    if (file.id === id) {
      return {
        ...file,
        deleted: true,
        deletedAt: new Date().toISOString(),
        originalLocation: file.location
      };
    }
    return file;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
  window.dispatchEvent(new Event('filesUpdated'));
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) {
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (hours < 24) {
    return `${hours === 1 ? 'About an hour' : `${hours} hours`} ago`;
  } else if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  }
}

export function createFolder(folderName: string, parentId: string | null = null): FileItem {
  const newFolder: FileItem = {
    id: Date.now().toString() + Math.random().toString(36),
    name: folderName,
    location: 'My files',
    type: 'folder',
    icon: 'https://res-1.public.onecdn.static.microsoft/files/fabric-cdn-prod_20251008.001/assets/item-types-experiment/32/folder.svg',
    size: 0,
    uploadedAt: new Date().toISOString(),
    owner: 'me',
    path: `/my-files/${folderName}`,
    isFolder: true,
    itemCount: 0,
    parentId
  };

  saveFile(newFolder);
  return newFolder;
}

export function getFilesByParent(parentId: string | null): FileItem[] {
  const allFiles = getAllFiles();
  return allFiles.filter(file => (file.parentId ?? null) === parentId && !file.deleted);
}

export function getDeletedFiles(): FileItem[] {
  const allFiles = getAllFiles();
  return allFiles.filter(file => file.deleted === true);
}

export function getActiveFiles(): FileItem[] {
  const allFiles = getAllFiles();
  return allFiles.filter(file => !file.deleted);
}

export function getFileById(id: string): FileItem | undefined {
  const allFiles = getAllFiles();
  return allFiles.find(file => file.id === id);
}

export function updateFolderItemCount(folderId: string): void {
  if (typeof window === 'undefined') return;
  const allFiles = getAllFiles();
  const childCount = allFiles.filter(f => f.parentId === folderId).length;

  const updatedFiles = allFiles.map(file => {
    if (file.id === folderId) {
      return { ...file, itemCount: childCount };
    }
    return file;
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
}

export function deleteFiles(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const updatedFiles = files.map(file => {
    if (ids.includes(file.id)) {
      return {
        ...file,
        deleted: true,
        deletedAt: new Date().toISOString(),
        originalLocation: file.location
      };
    }
    return file;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
  window.dispatchEvent(new Event('filesUpdated'));
}

export function updateFile(id: string, updates: Partial<FileItem>): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const updatedFiles = files.map(file =>
    file.id === id ? { ...file, ...updates } : file
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
  window.dispatchEvent(new Event('filesUpdated'));
}

export function moveFiles(ids: string[], targetParentId: string | null): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const updatedFiles = files.map(file =>
    ids.includes(file.id) ? { ...file, parentId: targetParentId } : file
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
  window.dispatchEvent(new Event('filesUpdated'));
}

export function copyFiles(ids: string[], targetParentId: string | null): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const filesToCopy = files.filter(f => ids.includes(f.id));

  const copiedFiles = filesToCopy.map(file => ({
    ...file,
    id: Date.now().toString() + Math.random().toString(36),
    name: `${file.name} - Copy`,
    parentId: targetParentId,
    uploadedAt: new Date().toISOString()
  }));

  const allFiles = [...files, ...copiedFiles];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allFiles));
  window.dispatchEvent(new Event('filesUpdated'));
}

export function restoreFiles(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const updatedFiles = files.map(file => {
    if (ids.includes(file.id) && file.deleted) {
      const { deleted, deletedAt, originalLocation, ...restoredFile } = file;
      return restoredFile;
    }
    return file;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
  window.dispatchEvent(new Event('filesUpdated'));
}

export function permanentlyDeleteFiles(ids: string[]): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const updatedFiles = files.filter(f => !ids.includes(f.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
  window.dispatchEvent(new Event('filesUpdated'));
}

export function trackFileOpen(id: string): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const updatedFiles = files.map(file =>
    file.id === id ? { ...file, lastOpenedAt: new Date().toISOString() } : file
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
}

export function getRecentlyOpenedFiles(): FileItem[] {
  const allFiles = getAllFiles();
  const now = new Date().getTime();
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

  return allFiles.filter(file => {
    if (!file.lastOpenedAt || file.deleted || file.isFolder) return false;
    const openedTime = new Date(file.lastOpenedAt).getTime();
    return openedTime >= twentyFourHoursAgo;
  }).sort((a, b) => {
    // Sort by most recently opened first
    const timeA = new Date(a.lastOpenedAt!).getTime();
    const timeB = new Date(b.lastOpenedAt!).getTime();
    return timeB - timeA;
  });
}

export function getRecentFiles(): FileItem[] {
  const allFiles = getAllFiles();
  const now = new Date().getTime();
  const twoHoursAgo = now - (2 * 60 * 60 * 1000);
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);

  // Use a Map to avoid duplicates (in case a file was both uploaded and opened recently)
  const recentFilesMap = new Map<string, FileItem>();

  // Add recently uploaded files (within 2 hours)
  allFiles.forEach(file => {
    if (file.deleted || file.isFolder) return;
    const uploadedTime = new Date(file.uploadedAt).getTime();
    if (uploadedTime >= twoHoursAgo) {
      recentFilesMap.set(file.id, file);
    }
  });

  // Add recently opened files (within 24 hours)
  allFiles.forEach(file => {
    if (file.deleted || file.isFolder || !file.lastOpenedAt) return;
    const openedTime = new Date(file.lastOpenedAt).getTime();
    if (openedTime >= twentyFourHoursAgo) {
      recentFilesMap.set(file.id, file);
    }
  });

  // Convert map to array and sort by most recent activity (either upload or open time)
  return Array.from(recentFilesMap.values()).sort((a, b) => {
    const timeA = Math.max(
      new Date(a.uploadedAt).getTime(),
      a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0
    );
    const timeB = Math.max(
      new Date(b.uploadedAt).getTime(),
      b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0
    );
    return timeB - timeA;
  });
}

export function getGalleryItems(): FileItem[] {
  const allFiles = getAllFiles();
  return allFiles
    .filter(file => !file.deleted && (file.type === 'image' || file.type === 'video'))
    .sort((a, b) => {
      // Sort by upload date, most recent first
      const timeA = new Date(a.uploadedAt).getTime();
      const timeB = new Date(b.uploadedAt).getTime();
      return timeB - timeA;
    });
}

export function groupGalleryItemsByDate(items: FileItem[]): Record<string, FileItem[]> {
  const grouped: Record<string, FileItem[]> = {};

  items.forEach(item => {
    try {
      const date = new Date(item.uploadedAt);

      // Validate that we have a valid date
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date for item: ${item.name}`, item.uploadedAt);
        return;
      }

      // Use more explicit date formatting to avoid locale issues
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      const dateKey = `${month} ${day}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    } catch (error) {
      console.error(`Error grouping item ${item.name}:`, error);
    }
  });

  return grouped;
}

export function toggleFileFavorite(id: string): void {
  if (typeof window === 'undefined') return;
  const files = getAllFiles();
  const updatedFiles = files.map(file => {
    if (file.id === id) {
      return { ...file, isFavorite: !file.isFavorite };
    }
    return file;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
  window.dispatchEvent(new Event('filesUpdated'));
}

export function getFavoriteFiles(): FileItem[] {
  const allFiles = getAllFiles();
  return allFiles.filter(file => !file.deleted && file.isFavorite === true);
}
