/**
 * @file src/app/(dashboard)/inwards/page.tsx
 * @description Next.js App Router Page for `/inwards`.
 * 
 * Renders GRN Stock Inward Invoices table.
 */

'use client';

import React from 'react';
import { StockInView } from '@/components/Views/StockInView';

export default function InwardsPage() {
  return <StockInView onClearPrefill={() => {}} />;
}
