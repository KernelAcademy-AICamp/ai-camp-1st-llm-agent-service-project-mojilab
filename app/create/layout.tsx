'use client';

import AppLayout from '@/components/AppLayout';
import { ReactNode } from 'react';

export default function CreateLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
