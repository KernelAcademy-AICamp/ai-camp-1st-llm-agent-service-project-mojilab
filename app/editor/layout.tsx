'use client';

import { ReactNode } from 'react';
import CommonNavbar from '@/components/CommonNavbar';

interface EditorLayoutProps {
  children: ReactNode;
}

export default function EditorLayout({ children }: EditorLayoutProps) {
  return (
    <>
      <CommonNavbar />
      <div style={{ paddingTop: '70px', minHeight: '100vh' }}>
        {children}
      </div>
    </>
  );
}
