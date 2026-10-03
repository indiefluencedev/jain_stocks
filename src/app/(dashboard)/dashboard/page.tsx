/**
 * @file src/app/(dashboard)/dashboard/page.tsx
 * @description Next.js App Router Page for `/dashboard`.
 * 
 * Renders live aggregate metrics, quick actions, stock alerts, and recent activity.
 */

'use client';

import React from 'react';
import { DashboardView } from '@/components/Views/DashboardView';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <DashboardView
      onNewRequest={() => {
        router.push('/requests');
      }}
    />
  );
}
