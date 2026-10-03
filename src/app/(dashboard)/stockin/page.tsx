/**
 * @file src/app/(dashboard)/stockin/page.tsx
 * @description Next.js App Router Page for `/stockin`.
 * 
 * Renders GRN Inward stock entry form with live part search and prefill support.
 */

'use client';

import React from 'react';
import { StockInView } from '@/components/Views/StockInView';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { DashboardView } from '@/components/Views/DashboardView';
import { useRouter } from 'next/navigation';

export default function StockInPage() {
  const searchParams = useSearchParams();
  const prefillPartId = searchParams.get('partId');
  const { can } = useApp();
  const router = useRouter();

  if (!can('stock_in')) {
    return <DashboardView onNewRequest={() => router.push('/requests')} />;
  }

  return (
    <StockInView
      prefillPartId={prefillPartId}
      onClearPrefill={() => {
        router.replace('/stockin');
      }}
    />
  );
}
