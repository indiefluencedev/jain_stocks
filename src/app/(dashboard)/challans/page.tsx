/**
 * @file src/app/(dashboard)/challans/page.tsx
 * @description Next.js App Router Page for `/challans`.
 * 
 * Renders delivery challans list and printable document view.
 */

'use client';

import React from 'react';
import { ChallansView } from '@/components/Views/ChallansView';

export default function ChallansPage() {
  return <ChallansView />;
}
