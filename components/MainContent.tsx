'use client';

import { useSidebar } from '@/contexts/SidebarContext';
import { ReactNode } from 'react';

interface MainContentProps {
  children: ReactNode;
}

export default function MainContent({ children }: MainContentProps) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      className="pt-0 pb-0 pl-0 pr-8 transition-all duration-300"
      style={{
        marginLeft: isCollapsed ? '60px' : '270px',
        backgroundColor: '#141414',
        minHeight: 'calc(100vh - 55px)',
        marginTop: '20px',
      }}
    >
      {children}
    </main>
  );
}
