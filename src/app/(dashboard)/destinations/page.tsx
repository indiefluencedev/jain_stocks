/**
 * @file src/app/(dashboard)/destinations/page.tsx
 * @description Next.js App Router Page for `/destinations`.
 * 
 * Renders destination locations and bike holding balance equation manager.
 */

'use client';

import React from 'react';
import { DestinationsView } from '@/components/Views/DestinationsView';

export default function DestinationsPage() {
  return <DestinationsView />;
}
