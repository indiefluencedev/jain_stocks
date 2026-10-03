/**
 * @file src/app/(dashboard)/reports/page.tsx
 * @description Next.js App Router Page for `/reports`.
 * 
 * Renders stock valuation and movement analytics reports.
 */

'use client';

import React from 'react';
import { ReportsView } from '@/components/Views/ReportsView';
import { useApp } from '@/context/AppContext';
import { DashboardView } from '@/components/Views/DashboardView';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const { can } = useApp();
  const router = useRouter();

  if (!can('reports')) {
    return <DashboardView onNewRequest={() => router.push('/requests')} />;
  }

  return <ReportsView />;
}
