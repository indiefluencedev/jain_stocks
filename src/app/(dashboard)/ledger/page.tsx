/**
 * @file src/app/(dashboard)/ledger/page.tsx
 * @description Next.js App Router Page for `/ledger`.
 * 
 * Renders master double-entry stock movement journal table.
 */

'use client';

import React from 'react';
import { LedgerView } from '@/components/Views/LedgerView';
import { useApp } from '@/context/AppContext';
import { DashboardView } from '@/components/Views/DashboardView';
import { useRouter } from 'next/navigation';

export default function LedgerPage() {
  const { can } = useApp();
  const router = useRouter();

  if (!can('reports')) {
    return <DashboardView onNewRequest={() => router.push('/requests')} />;
  }

  return <LedgerView />;
}
