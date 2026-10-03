/**
 * @file src/app/(dashboard)/returns/page.tsx
 * @description Next.js App Router Page for `/returns`.
 * 
 * Renders stock returns and physical count adjustments view.
 */

'use client';

import React from 'react';
import { ReturnsView } from '@/components/Views/ReturnsView';

export default function ReturnsPage() {
  return <ReturnsView />;
}
