/**
 * @file src/app/(dashboard)/requests/page.tsx
 * @description Next.js App Router Page for `/requests`.
 * 
 * Renders stock indent requests and issue action table.
 */

'use client';

import React from 'react';
import { RequestsView } from '@/components/Views/RequestsView';

export default function RequestsPage() {
  return <RequestsView />;
}
