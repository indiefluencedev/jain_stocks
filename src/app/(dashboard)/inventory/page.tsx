/**
 * @file src/app/(dashboard)/inventory/page.tsx
 * @description Next.js App Router Page for `/inventory`.
 * 
 * Renders the inventory parts catalog table with search and filtering.
 */

'use client';

import React from 'react';
import { InventoryView } from '@/components/Views/InventoryView';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
  const router = useRouter();

  return (
    <InventoryView
      onGoStockIn={(partId) => {
        router.push(`/stockin?partId=${partId}`);
      }}
    />
  );
}
