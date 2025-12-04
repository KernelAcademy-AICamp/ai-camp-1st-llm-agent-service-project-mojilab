'use client';

import { Suspense } from 'react';
import SeriesGenerator from '@/components/SeriesGenerator';
import AppLayout from '@/components/AppLayout';

export default function SeriesPage() {
  return (
    <AppLayout>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      }>
        <SeriesGenerator />
      </Suspense>
    </AppLayout>
  );
}
